import * as THREE from 'three';
import { mergeStaticGroupByMaterial } from '../perf-manager.js';

/**
 * ============================================================================
 * MONUMENT COMPLET #7 : LE PANTHÉON DE PARIS (MONTAGNE SAINTE-GENEVIÈVE)
 * Position GPS : 48.8462° N, 2.3464° E -> (+102, +26, +1913)
 * Orientation : Portique corinthien Ouest (-X) exactement dans l'axe Rue Soufflot
 *               vers le Jardin du Luxembourg (rotY = -0.263 rad)
 *
 * Modélisation muséale 1:1 extérieur + intérieur visitable (< 35 DC en LOD 0) :
 *  - Plan en croix grecque (110 m × 84 m × 83 m), stylobate & grand emmarchement
 *  - Péristyle corinthien (22 colonnes cannelées), frise gravée dorée
 *    « AUX GRANDS HOMMES LA PATRIE RECONNAISSANTE » & fronton sculpté de David d'Angers
 *  - Dôme monumental (83 m) : tambour périptère à 32 colonnes corinthiennes libres,
 *    galerie panoramique visitable (51,5 m), coupole plomb patiné à 16 nervures & lanterneau
 *  - Intérieur visitable : colonnades corinthiennes, sol marbre polychrome, fresques
 *    Puvis de Chavannes, triple coupole à oculus ouvert (Apothéose de Sainte-Geneviève),
 *    Pendule de Foucault animé (fil de 63 m + sphère laiton + cadran gradué),
 *    groupe sculpté de la Convention Nationale & descente vers la Crypte
 *  - Place du Panthéon complète : façades courbes jumelles de Soufflot (Faculté de Droit
 *    & Mairie du 5e), Bibliothèque Sainte-Geneviève (Labrouste), Église Saint-Étienne-du-Mont
 *    & Lycée Henri-IV avec la Tour Clovis
 * ============================================================================
 */

export const PANTHEON_WORLD_POS = new THREE.Vector3(102, 26, 1913);
export const PANTHEON_ROT_Y = -0.263;

const COS_PAN = Math.cos(PANTHEON_ROT_Y);
const SIN_PAN = Math.sin(PANTHEON_ROT_Y);

export function worldToPantheonLocal(wx, wz) {
  const dx = wx - PANTHEON_WORLD_POS.x;
  const dz = wz - PANTHEON_WORLD_POS.z;
  return {
    lx: dx * COS_PAN - dz * SIN_PAN,
    lz: dx * SIN_PAN + dz * COS_PAN,
  };
}

function createPantheonAshlarTexture() {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  // Calcaire blond doré de Saint-Leu / Bagneux (teinte lumineuse du Panthéon restauré)
  ctx.fillStyle = '#e7ddc8';
  ctx.fillRect(0, 0, size, size);

  const rows = 14;
  const rh = size / rows;
  for (let r = 0; r < rows; r++) {
    const y = r * rh;
    const off = (r % 2) * 44;
    for (let x = -44; x < size; x += 88) {
      const n = ((r * 31 + x * 17) % 14) - 7;
      ctx.fillStyle = `rgb(${230 + n}, ${220 + n}, ${198 + n})`;
      ctx.fillRect(x + off + 1.5, y + 1.5, 85, rh - 3);
    }
    ctx.fillStyle = 'rgba(110, 96, 76, 0.18)';
    ctx.fillRect(0, y, size, 1.8);
  }
  for (let i = 0; i < 3600; i++) {
    const x = (i * 193) % size;
    const y = (i * 317) % size;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,252,244,0.08)' : 'rgba(92,80,62,0.07)';
    ctx.fillRect(x, y, 2, 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createFlutedColumnTexture() {
  const w = 256;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ebe1cd';
  ctx.fillRect(0, 0, w, h);

  // 24 cannelures classiques corinthiennes
  const flutes = 24;
  const fw = w / flutes;
  for (let i = 0; i < flutes; i++) {
    const x = i * fw;
    const grad = ctx.createLinearGradient(x, 0, x + fw, 0);
    grad.addColorStop(0.0, '#f4ecdc');
    grad.addColorStop(0.22, '#cfc2aa');
    grad.addColorStop(0.55, '#ded2bc');
    grad.addColorStop(0.85, '#f2ead9');
    grad.addColorStop(1.0, '#c7b99f');
    ctx.fillStyle = grad;
    ctx.fillRect(x, 0, fw, h);
  }
  // Joints horizontaux des tambours de pierre
  ctx.fillStyle = 'rgba(108, 95, 76, 0.22)';
  for (let y = 32; y < h; y += 32) {
    ctx.fillRect(0, y, w, 1.5);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createInscriptionFriezeTexture() {
  const w = 2048;
  const h = 192;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#ddd0b7');
  bg.addColorStop(0.5, '#eae0cc');
  bg.addColorStop(1, '#d4c5aa');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Moulures haut & bas
  ctx.fillStyle = '#b9a88c';
  ctx.fillRect(0, 0, w, 14);
  ctx.fillRect(0, h - 14, w, 14);
  ctx.fillStyle = '#f5eedf';
  ctx.fillRect(0, 14, w, 6);
  ctx.fillRect(0, h - 20, w, 6);

  // Inscription historique en lettres de bronze doré
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 54px Georgia, "Times New Roman", serif';
  const txt = 'AUX GRANDS HOMMES  LA PATRIE RECONNAISSANTE';
  ctx.fillStyle = 'rgba(52, 38, 22, 0.55)';
  ctx.fillText(txt, w * 0.5 + 3, h * 0.52 + 3);
  ctx.fillStyle = '#b9882f';
  ctx.fillText(txt, w * 0.5, h * 0.52);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createGarlandFriezeTexture() {
  const w = 512;
  const h = 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#e2d6be';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#bfae91';
  ctx.fillRect(0, 0, w, 10);
  ctx.fillRect(0, h - 10, w, 10);

  // Guirlandes sculptées de feuilles de chêne & laurier + médaillons
  ctx.strokeStyle = '#a89678';
  ctx.lineWidth = 8;
  for (let i = 0; i < 4; i++) {
    const x0 = i * 128;
    ctx.beginPath();
    ctx.arc(x0 + 64, 24, 52, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = '#c8b798';
    ctx.beginPath();
    ctx.arc(x0 + 64, 48, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#9e8c6e';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = '#a89678';
    ctx.lineWidth = 8;
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(6, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createLeadDomeTexture() {
  const w = 512;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  // Plomb patiné bleu-gris argenté du Panthéon
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#6a7886');
  grad.addColorStop(0.5, '#596775');
  grad.addColorStop(1, '#4c5966');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Joints verticaux à tasseaux de plomb + tables horizontales
  for (let x = 0; x < w; x += 32) {
    ctx.fillStyle = 'rgba(215, 228, 240, 0.16)';
    ctx.fillRect(x, 0, 3, h);
    ctx.fillStyle = 'rgba(28, 35, 42, 0.28)';
    ctx.fillRect(x + 3, 0, 2, h);
  }
  for (let y = 0; y < h; y += 48) {
    ctx.fillStyle = 'rgba(30, 38, 46, 0.16)';
    ctx.fillRect(0, y, w, 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createMarbleFloorTexture() {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#ddd3c0';
  ctx.fillRect(0, 0, size, size);

  const cell = 64;
  for (let y = 0; y < size; y += cell) {
    for (let x = 0; x < size; x += cell) {
      const even = ((x + y) / cell) % 2 === 0;
      ctx.fillStyle = even ? '#e8dfce' : '#cfc2aa';
      ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4);
      // Cabochon losange noir/ocre aux intersections
      ctx.fillStyle = even ? '#564c43' : '#9c7852';
      ctx.beginPath();
      ctx.moveTo(x + cell * 0.5, y + 18);
      ctx.lineTo(x + cell - 18, y + cell * 0.5);
      ctx.lineTo(x + cell * 0.5, y + cell - 18);
      ctx.lineTo(x + 18, y + cell * 0.5);
      ctx.closePath();
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 10);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createFoucaultDialTexture() {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  const cx = size * 0.5;
  const cy = size * 0.5;
  ctx.fillStyle = '#ebe2d0';
  ctx.fillRect(0, 0, size, size);

  // Rose des vents & cercle gradué de Léon Foucault (1851)
  ctx.fillStyle = '#d9ccb2';
  ctx.beginPath();
  ctx.arc(cx, cy, 240, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#b48735';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(cx, cy, 232, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#6c5230';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 198, 0, Math.PI * 2);
  ctx.stroke();

  // Graduations de 5° en 5°
  for (let deg = 0; deg < 360; deg += 5) {
    const a = (deg * Math.PI) / 180;
    const major = deg % 30 === 0;
    const r0 = major ? 182 : 204;
    ctx.strokeStyle = major ? '#8a6222' : '#6c573c';
    ctx.lineWidth = major ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a) * 224, cy + Math.sin(a) * 224);
    ctx.stroke();
  }

  // Étoile centrale en marbre noir & or
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    const r = k % 2 === 0 ? 156 : 96;
    ctx.fillStyle = k % 2 === 0 ? '#4e4237' : '#c69943';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a - 0.14) * 34, cy + Math.sin(a - 0.14) * 34);
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.lineTo(cx + Math.cos(a + 0.14) * 34, cy + Math.sin(a + 0.14) * 34);
    ctx.closePath();
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createApotheosisDomeTexture() {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  // Fresque céleste d'Antoine-Jean Gros (1824) : L'Apothéose de Sainte-Geneviève (ciel d'or, nuées & 4 dynasties)
  const rad = ctx.createRadialGradient(256, 256, 20, 256, 256, 256);
  rad.addColorStop(0.0, '#fff4cf');
  rad.addColorStop(0.28, '#f4d996');
  rad.addColorStop(0.55, '#9cb9cf');
  rad.addColorStop(0.78, '#7a94ad');
  rad.addColorStop(1.0, '#8b6a48');
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, size, size);

  // Nuées dorées & couronne des personnages royaux autour de la fresque
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    const r = 175 + (k % 3) * 14;
    ctx.fillStyle = k % 3 === 0 ? 'rgba(182, 72, 58, 0.52)' : k % 3 === 1 ? 'rgba(56, 84, 134, 0.52)' : 'rgba(218, 172, 82, 0.58)';
    ctx.beginPath();
    ctx.arc(256 + Math.cos(a) * r, 256 + Math.sin(a) * r, 22, 0, Math.PI * 2);
    ctx.fill();
  }
  // Rayons célestes dorés au centre
  ctx.strokeStyle = 'rgba(255, 245, 200, 0.45)';
  ctx.lineWidth = 4;
  for (let k = 0; k < 32; k++) {
    const a = (k / 32) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(256, 256);
    ctx.lineTo(256 + Math.cos(a) * 140, 256 + Math.sin(a) * 140);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createPuvisMuralTexture(theme = 'genevieve') {
  const w = 512;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  // Palette pastel douce de Pierre Puvis de Chavannes (La Vie de Sainte Geneviève, 1874–1898)
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  if (theme === 'genevieve') {
    sky.addColorStop(0, '#c7d6dc');
    sky.addColorStop(0.55, '#dfd9c4');
    sky.addColorStop(1, '#9ca487');
  } else {
    sky.addColorStop(0, '#c8b8a8');
    sky.addColorStop(0.55, '#dcd0b8');
    sky.addColorStop(1, '#8c7e68');
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Collines / architecture antique de Lutèce à l'arrière-plan
  ctx.fillStyle = theme === 'genevieve' ? '#adb49a' : '#a89682';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.62);
  ctx.quadraticCurveTo(w * 0.25, h * 0.42, w * 0.55, h * 0.58);
  ctx.quadraticCurveTo(w * 0.8, h * 0.48, w, h * 0.6);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  // Silhouettes peintes drapées en frise néoclassique
  const robeColors = ['#d8ccb4', '#8e6252', '#64768a', '#b69766', '#9e5446', '#72826c'];
  for (let i = 0; i < 11; i++) {
    const x = 36 + i * 44;
    ctx.fillStyle = robeColors[i % robeColors.length];
    ctx.fillRect(x - 10, h * 0.48, 20, h * 0.42);
    ctx.fillStyle = '#e4c9ac';
    ctx.beginPath();
    ctx.arc(x, h * 0.44, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  // Encadrement peint à la frise grecque
  ctx.strokeStyle = '#9c8664';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, w - 10, h - 10);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createApseMosaicTexture() {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  // Mosaïque byzantine d'Ernest Hébert (1884) : fond d'or tessellé, auréole rayonnante & figures bleu-pourpre
  const rad = ctx.createRadialGradient(256, 360, 20, 256, 320, 290);
  rad.addColorStop(0.0, '#ffe89c');
  rad.addColorStop(0.42, '#d8a642');
  rad.addColorStop(0.78, '#b5842a');
  rad.addColorStop(1.0, '#78561e');
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, size, size);

  // Bordure bleu outremer & entrelacs dorés
  ctx.strokeStyle = '#1f365c';
  ctx.lineWidth = 28;
  ctx.beginPath();
  ctx.arc(256, 480, 240, Math.PI, 0);
  ctx.stroke();
  ctx.strokeStyle = '#f2c864';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(256, 480, 224, Math.PI, 0);
  ctx.stroke();

  // Nimbe central rayonnant + figure centrale (Le Christ / L'Ange de la France) & figures latérales
  ctx.fillStyle = 'rgba(255, 244, 198, 0.45)';
  ctx.beginPath();
  ctx.arc(256, 260, 74, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#253d68';
  ctx.fillRect(228, 290, 56, 170);
  ctx.fillStyle = '#8b2b2b';
  ctx.fillRect(236, 305, 40, 140);
  ctx.fillStyle = '#f2d2ad';
  ctx.beginPath();
  ctx.arc(256, 264, 24, 0, Math.PI * 2);
  ctx.fill();
  [148, 364].forEach((fx) => {
    ctx.fillStyle = '#2b476e';
    ctx.fillRect(fx - 20, 325, 40, 130);
    ctx.fillStyle = '#ead0ae';
    ctx.beginPath();
    ctx.arc(fx, 305, 16, 0, Math.PI * 2);
    ctx.fill();
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createPedimentReliefTexture() {
  const w = 1024;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  // Fond de tympan ombré en pierre blonde sculptée (David d'Angers, 1837)
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#b9aa8e');
  bg.addColorStop(0.55, '#cfc1a6');
  bg.addColorStop(1, '#ded2ba');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Guirlandes & drapés bas-reliefs ombrés dans le triangle du fronton
  for (let i = 0; i < 19; i++) {
    const t = (i + 0.5) / 19;
    const distC = Math.abs(t - 0.5) * 2;
    const figH = Math.max(24, (1 - distC * 0.88) * 185);
    const fx = t * w;
    // Ombre portée du haut-relief
    ctx.fillStyle = 'rgba(72, 60, 44, 0.34)';
    ctx.fillRect(fx - 13, h - figH + 6, 28, figH);
    // Drapé sculpté ton pierre
    ctx.fillStyle = '#ebe1cd';
    ctx.fillRect(fx - 15, h - figH, 26, figH);
    ctx.fillStyle = '#cbbca0';
    ctx.fillRect(fx - 6, h - figH + 14, 4, figH - 14);
    ctx.fillRect(fx + 3, h - figH + 18, 4, figH - 18);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createLabrousteLibraryTexture() {
  const w = 512;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  // Façade néo-Renaissance de la Bibliothèque Sainte-Geneviève (Labrouste, 1850)
  ctx.fillStyle = '#dfd4be';
  ctx.fillRect(0, 0, w, h);

  // Soubassement à petites baies rectangulaires
  ctx.fillStyle = '#d2c5ab';
  ctx.fillRect(0, h * 0.58, w, h * 0.42);
  for (let i = 0; i < 8; i++) {
    const x = 14 + i * 62;
    // Grande baie cintrée supérieure (salle de lecture)
    ctx.fillStyle = '#2d3b4a';
    ctx.fillRect(x, 34, 40, 88);
    ctx.beginPath();
    ctx.arc(x + 20, 34, 20, Math.PI, 0);
    ctx.fill();
    // Panneau gravé des 810 grands auteurs sous l'arcade !
    ctx.fillStyle = '#cfc2a6';
    ctx.fillRect(x + 2, 128, 36, 26);
    ctx.fillStyle = '#7c6c56';
    for (let ln = 0; ln < 4; ln++) {
      ctx.fillRect(x + 6, 132 + ln * 5, 28, 1.8);
    }
    // Fenêtre du rez-de-chaussée
    ctx.fillStyle = '#334252';
    ctx.fillRect(x + 8, 178, 24, 42);
  }
  ctx.fillStyle = '#f0e7d6';
  ctx.fillRect(0, 0, w, 12);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createClassicalCivicFacadeTexture() {
  const w = 512;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#e5dac4';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#d4c6ac';
  ctx.fillRect(0, 165, w, 91);

  for (let i = 0; i < 8; i++) {
    const x = 14 + i * 62;
    // Fenêtre étage noble + fronton
    ctx.fillStyle = '#2a3744';
    ctx.fillRect(x + 6, 36, 30, 56);
    ctx.fillStyle = '#f2ead9';
    ctx.fillRect(x + 2, 28, 38, 6);
    // Fenêtre entresol
    ctx.fillStyle = '#2e3c4a';
    ctx.fillRect(x + 6, 108, 30, 42);
    // Arcade rez-de-chaussée
    ctx.fillStyle = '#25313d';
    ctx.fillRect(x + 4, 184, 34, 62);
    ctx.beginPath();
    ctx.arc(x + 21, 184, 17, Math.PI, 0);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(2, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createCobblePlazaTexture() {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#c8bfb0';
  ctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 16) {
    const off = ((y / 16) % 2) * 8;
    for (let x = -8; x < size; x += 16) {
      const n = ((x * 23 + y * 41) % 16) - 8;
      ctx.fillStyle = `rgb(${196 + n}, ${188 + n}, ${174 + n})`;
      ctx.fillRect(x + off + 1, y + 1, 14, 14);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(22, 18);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function buildPantheonMonument(scene) {
  const root = new THREE.Group();
  root.name = 'PantheonMonument';
  root.position.copy(PANTHEON_WORLD_POS);
  root.rotation.y = PANTHEON_ROT_Y;
  scene.add(root);
  root.updateMatrixWorld(true);

  const colliders = [];
  const circleColliders = [];

  function localToWorld(lx, ly, lz) {
    return new THREE.Vector3(lx, ly, lz).applyMatrix4(root.matrixWorld);
  }

  function registerLocalBoxCollider(minX, maxX, minZ, maxZ) {
    // Convertit les 4 coins en AABB monde (les murs épais protègent sans bloquer les entrées)
    const pts = [
      localToWorld(minX, 0, minZ),
      localToWorld(maxX, 0, minZ),
      localToWorld(maxX, 0, maxZ),
      localToWorld(minX, 0, maxZ),
    ];
    let wMinX = Infinity, wMaxX = -Infinity, wMinZ = Infinity, wMaxZ = -Infinity;
    pts.forEach((p) => {
      if (p.x < wMinX) wMinX = p.x;
      if (p.x > wMaxX) wMaxX = p.x;
      if (p.z < wMinZ) wMinZ = p.z;
      if (p.z > wMaxZ) wMaxZ = p.z;
    });
    colliders.push({ minX: wMinX, maxX: wMaxX, minZ: wMinZ, maxZ: wMaxZ });
  }

  function registerLocalCircleCollider(lx, lz, r) {
    const w = localToWorld(lx, 0, lz);
    circleColliders.push({ x: w.x, z: w.z, r });
  }

  // --- MATÉRIAUX ARCHITECTURAUX ---
  const matStone = new THREE.MeshStandardMaterial({
    map: createPantheonAshlarTexture(),
    roughness: 0.82,
    metalness: 0.04,
  });
  const matStoneLight = new THREE.MeshStandardMaterial({
    color: 0xefe7d7,
    roughness: 0.78,
  });
  const matStoneWarm = new THREE.MeshStandardMaterial({
    color: 0xd9cbb1,
    roughness: 0.84,
  });
  const matFlutedCol = new THREE.MeshStandardMaterial({
    map: createFlutedColumnTexture(),
    roughness: 0.74,
  });
  const matFrieze = new THREE.MeshStandardMaterial({
    map: createInscriptionFriezeTexture(),
    emissive: new THREE.Color(0x523c1a),
    emissiveIntensity: 0.0,
    roughness: 0.68,
  });
  const matPedimentRelief = new THREE.MeshStandardMaterial({
    map: createPedimentReliefTexture(),
    roughness: 0.80,
  });
  const matApseMosaic = new THREE.MeshStandardMaterial({
    map: createApseMosaicTexture(),
    emissive: new THREE.Color(0xffd27a),
    emissiveMap: createApseMosaicTexture(),
    emissiveIntensity: 0.28,
    roughness: 0.42,
    metalness: 0.24,
  });
  const matGarland = new THREE.MeshStandardMaterial({
    map: createGarlandFriezeTexture(),
    roughness: 0.8,
  });
  const matLeadDome = new THREE.MeshStandardMaterial({
    map: createLeadDomeTexture(),
    roughness: 0.44,
    metalness: 0.36,
  });
  const matGold = new THREE.MeshStandardMaterial({
    color: 0xe6b852,
    roughness: 0.24,
    metalness: 0.85,
  });
  const matBronze = new THREE.MeshStandardMaterial({
    color: 0x3f352b,
    roughness: 0.42,
    metalness: 0.65,
  });
  const matMarbleWhite = new THREE.MeshStandardMaterial({
    color: 0xf7f3eb,
    roughness: 0.36,
    metalness: 0.05,
  });
  const matMarbleFloor = new THREE.MeshStandardMaterial({
    map: createMarbleFloorTexture(),
    roughness: 0.34,
    metalness: 0.08,
  });
  const matFoucaultDial = new THREE.MeshStandardMaterial({
    map: createFoucaultDialTexture(),
    roughness: 0.42,
  });
  const matApotheosis = new THREE.MeshStandardMaterial({
    map: createApotheosisDomeTexture(),
    emissive: new THREE.Color(0xffe2a8),
    emissiveMap: createApotheosisDomeTexture(),
    emissiveIntensity: 0.32,
    roughness: 0.72,
    side: THREE.BackSide,
  });
  const matMuralGen = new THREE.MeshStandardMaterial({
    map: createPuvisMuralTexture('genevieve'),
    roughness: 0.76,
  });
  const matMuralHist = new THREE.MeshStandardMaterial({
    map: createPuvisMuralTexture('history'),
    roughness: 0.76,
  });
  const matInteriorVault = new THREE.MeshStandardMaterial({
    color: 0xeae0ce,
    roughness: 0.82,
    side: THREE.DoubleSide,
  });
  const matWindowGlass = new THREE.MeshStandardMaterial({
    color: 0x89aac0,
    emissive: new THREE.Color(0xffcf82),
    emissiveIntensity: 0.14,
    roughness: 0.22,
    metalness: 0.45,
  });
  const matVelvetCord = new THREE.MeshStandardMaterial({ color: 0x7c1d24, roughness: 0.78 });
  const matSlate = new THREE.MeshStandardMaterial({ color: 0x3a4452, roughness: 0.56, metalness: 0.28 });
  const matCobble = new THREE.MeshStandardMaterial({ map: createCobblePlazaTexture(), roughness: 0.9 });
  const matAsphalt = new THREE.MeshStandardMaterial({ color: 0x383b42, roughness: 0.9 });
  const matLibraryTex = new THREE.MeshStandardMaterial({ map: createLabrousteLibraryTexture(), roughness: 0.82 });
  const matCivicTex = new THREE.MeshStandardMaterial({ map: createClassicalCivicFacadeTexture(), roughness: 0.8 });
  const matLampIron = new THREE.MeshStandardMaterial({ color: 0x222928, roughness: 0.48, metalness: 0.52 });
  const matLampGlow = new THREE.MeshStandardMaterial({
    color: 0xfff4d4,
    emissive: new THREE.Color(0xffbe58),
    emissiveIntensity: 0.25,
    roughness: 0.2,
  });
  const matIronFence = new THREE.MeshStandardMaterial({ color: 0x24282b, roughness: 0.52, metalness: 0.55 });

  // Groupes de structure (pour LOD & fusion haute performance)
  const exteriorGroup = new THREE.Group();
  exteriorGroup.name = 'PantheonExterior';
  root.add(exteriorGroup);

  const interiorGroup = new THREE.Group();
  interiorGroup.name = 'PantheonInterior';
  root.add(interiorGroup);

  const envGroup = new THREE.Group();
  envGroup.name = 'PantheonPlaceQuartierLatin';
  root.add(envGroup);

  function addBox(w, h, d, x, y, z, mat, { cast = true, receive = true, parent = exteriorGroup } = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = cast;
    m.receiveShadow = receive;
    parent.add(m);
    return m;
  }

  // Helper colonne corinthienne cannelée complète (base attique + fût galbé + chapiteau à feuilles d'acanthe)
  function addCorinthianColumn(x, yBase, z, height, rBot, rTop, parent = exteriorGroup, withCollider = false) {
    const g = new THREE.Group();
    g.position.set(x, yBase, z);
    const plinthH = rBot * 0.72;
    const capH = rTop * 2.15;
    const shaftH = Math.max(1.0, height - plinthH - capH);

    // Plinthe carrée + tore attique
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(rBot * 2.55, plinthH * 0.65, rBot * 2.55), matStoneLight);
    plinth.position.y = plinthH * 0.325;
    g.add(plinth);
    const torus = new THREE.Mesh(new THREE.CylinderGeometry(rBot * 1.12, rBot * 1.24, plinthH * 0.38, 12), matStoneLight);
    torus.position.y = plinthH * 0.82;
    g.add(torus);

    // Fût cannelé
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, shaftH, 14), matFlutedCol);
    shaft.position.y = plinthH + shaftH * 0.5;
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    g.add(shaft);

    // Corbeille corinthienne & abaque mouluré
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(rTop * 1.38, rTop * 0.96, capH * 0.76, 12), matStoneLight);
    bell.position.y = plinthH + shaftH + capH * 0.38;
    g.add(bell);
    const abacus = new THREE.Mesh(new THREE.BoxGeometry(rTop * 2.75, capH * 0.26, rTop * 2.75), matStoneLight);
    abacus.position.y = plinthH + shaftH + capH * 0.88;
    g.add(abacus);

    parent.add(g);
    if (withCollider) registerLocalCircleCollider(x, z, rBot * 1.35);
  }

  /**
   * ==========================================================================
   * 1. STYLOBATE MONUMENTAL, GRAND EMMARCHEMENT OUEST & CORPS EN CROIX GRECQUE
   * ==========================================================================
   */
  const FLOOR_Y = 2.40;
  const WALL_TOP_Y = 24.4;

  // Socle en croix grecque (fondations ancrées à -2,5 m pour zéro flottement sur la Montagne Sainte-Geneviève)
  addBox(98.0, 4.9, 36.4, 1.0, FLOOR_Y - 2.45, 0, matStoneWarm);     // Bras Ouest-Est (x = -48..+50)
  addBox(36.4, 4.9, 86.0, 0.0, FLOOR_Y - 2.45, 0, matStoneWarm);     // Bras Nord-Sud (z = -43..+43)
  // Embase du Portique Ouest (x = -55..-36, z = -19.2..+19.2)
  addBox(20.0, 4.9, 38.4, -45.5, FLOOR_Y - 2.45, 0, matStoneWarm);

  // Grand escalier monumental de 11 marches à l'Ouest (x = -62.5..-54.5 -> y = 0.0..2.4 m)
  const stepCount = 11;
  for (let s = 0; s < stepCount; s++) {
    const frac = (s + 1) / stepCount;
    const h = frac * FLOOR_Y;
    const xPos = -62.4 + s * 0.72;
    addBox(0.85, h + 0.6, 38.6, xPos, (h - 0.6) * 0.5, 0, matStoneLight, { cast: false });
  }
  // Deux dés / joues d'escalier en pierre encadrant l'emmarchement + 2 grands candélabres bronze
  [-19.6, 19.6].forEach((sz) => {
    addBox(8.6, 2.75, 1.6, -58.6, 1.35, sz, matStoneLight);
    const candBase = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.62, 1.1, 10), matBronze);
    candBase.position.set(-61.8, 3.25, sz);
    exteriorGroup.add(candBase);
    const candShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, 3.6, 8), matBronze);
    candShaft.position.set(-61.8, 5.5, sz);
    exteriorGroup.add(candShaft);
    const candGlobe = new THREE.Mesh(new THREE.SphereGeometry(0.48, 10, 8), matLampGlow);
    candGlobe.position.set(-61.8, 7.6, sz);
    exteriorGroup.add(candGlobe);
  });

  // --- MURS EXTÉRIEURS EN CROIX GRECQUE (VRAIE COQUE CREUSE VISITABLE !) ---
  const wallH = WALL_TOP_Y - FLOOR_Y; // 22.0 m
  const wallMidY = FLOOR_Y + wallH * 0.5;
  const WT = 2.6; // Épaisseur monumentale des murs néoclassiques

  // 1) Façade Ouest derrière le Portique (x = -36.2) : PERCÉE AU CENTRE POUR ENTRER DANS LA NEF !
  addBox(WT, wallH, 14.2, -36.2, wallMidY, -10.4, matStone);
  addBox(WT, wallH, 14.2, -36.2, wallMidY, +10.4, matStone);
  addBox(WT, 12.2, 6.8, -36.2, 18.3, 0, matStone); // Imposte au-dessus du grand portail ouvert (y = 12.2..24.4)
  registerLocalBoxCollider(-37.8, -34.8, -17.8, -3.2);
  registerLocalBoxCollider(-37.8, -34.8, +3.2, +17.8);

  // Encadrement monumental du Grand Portail Central & 2 vantaux de bronze ouverts vers l'intérieur !
  addBox(0.9, 10.2, 1.1, -37.5, FLOOR_Y + 5.1, -3.4, matStoneLight);
  addBox(0.9, 10.2, 1.1, -37.5, FLOOR_Y + 5.1, +3.4, matStoneLight);
  addBox(1.4, 1.3, 8.6, -37.6, FLOOR_Y + 10.4, 0, matStoneLight);
  // Fronton de porte triangulaire sculpté + 2 portes latérales monumentales en bronze fermé
  [-10.2, 10.2].forEach((dz) => {
    addBox(0.5, 7.2, 3.8, -37.6, FLOOR_Y + 3.6, dz, matBronze);
    addBox(0.9, 0.85, 4.8, -37.6, FLOOR_Y + 7.6, dz, matStoneLight);
    // Bas-relief au-dessus des portes latérales
    addBox(0.35, 3.0, 5.4, -37.6, FLOOR_Y + 11.4, dz, matStoneWarm);
  });
  // Vantaux de bronze centraux grands ouverts (invitant le visiteur à entrer !)
  [-3.0, 3.0].forEach((dz) => {
    addBox(2.6, 9.2, 0.35, -34.6, FLOOR_Y + 4.6, dz, matBronze);
  });

  // 2) Murs latéraux du Bras Ouest (x = -36.2..-16.2, z = ±16.8)
  [-16.8, 16.8].forEach((mz) => {
    addBox(21.4, wallH, WT, -26.2, wallMidY, mz, matStone);
    registerLocalBoxCollider(-37.2, -15.5, mz - 1.5, mz + 1.5);
  });

  // 3) Transepts Nord & Sud (z = -41.5..-16.8 et +16.8..+41.5, x = ±16.8)
  [-1, 1].forEach((sideZ) => {
    const zMid = sideZ * 29.2;
    const zEnd = sideZ * 41.2;
    addBox(WT, wallH, 25.4, -16.8, wallMidY, zMid, matStone);
    addBox(WT, wallH, 25.4, +16.8, wallMidY, zMid, matStone);
    addBox(36.2, wallH, WT, 0, wallMidY, zEnd, matStone);
    registerLocalBoxCollider(-18.2, -15.4, Math.min(sideZ * 16.5, zEnd) - 1, Math.max(sideZ * 16.5, zEnd) + 1);
    registerLocalBoxCollider(+15.4, +18.2, Math.min(sideZ * 16.5, zEnd) - 1, Math.max(sideZ * 16.5, zEnd) + 1);
    registerLocalBoxCollider(-18.2, +18.2, zEnd - 1.5, zEnd + 1.5);
  });

  // 4) Bras Est / Chœur & Abside de la Convention (x = +16.8..+47.2, z = ±16.8)
  [-16.8, 16.8].forEach((mz) => {
    addBox(31.6, wallH, WT, 32.0, wallMidY, mz, matStone);
    registerLocalBoxCollider(15.5, 48.2, mz - 1.5, mz + 1.5);
  });
  addBox(WT, wallH, 36.2, 47.2, wallMidY, 0, matStone);
  registerLocalBoxCollider(45.8, 48.6, -18.2, 18.2);

  // Frise de guirlandes sculptées + corniche à modillons + balustrade courant sur tout le pourtour
  // (bâtie en bordures creuses de 3,2 m d'épaisseur pour laisser la croisée centrale 100 % ouverte vers le Dôme !)
  const addHollowWallCrown = (w, d, cx, cz) => {
    const t = 3.2;
    const hw = w * 0.5;
    const hd = d * 0.5;
    // 4 bandeaux périphériques (frise de guirlandes + corniche saillante + acrotère)
    [
      [w + 0.4, t, cx, cz - hd + t * 0.5],
      [w + 0.4, t, cx, cz + hd - t * 0.5],
      [t, d - t * 1.8, cx - hw + t * 0.5, cz],
      [t, d - t * 1.8, cx + hw - t * 0.5, cz],
    ].forEach(([bw, bd, bx, bz]) => {
      addBox(bw, 2.1, bd, bx, WALL_TOP_Y - 2.6, bz, matGarland, { cast: false });
      addBox(bw + 1.0, 1.15, bd + 1.0, bx, WALL_TOP_Y + 0.35, bz, matStoneLight);
      addBox(bw + 0.2, 1.65, bd + 0.2, bx, WALL_TOP_Y + 1.65, bz, matStoneWarm);
    });
  };
  // Couronnement des 4 bras séparément (laissant le puits central [-15..+15] entièrement libre !)
  addHollowWallCrown(22.0, 36.2, -26.2, 0);  // Bras Ouest
  addHollowWallCrown(32.0, 36.2, +32.0, 0);  // Bras Est
  addHollowWallCrown(36.2, 26.0, 0, -29.2);  // Bras Nord
  addHollowWallCrown(36.2, 26.0, 0, +29.2);  // Bras Sud

  // 4 Pavillons d'angles rentrants & toitures en plomb des 4 bras (croisée centrale 100 % OUVERTE vers le Dôme !)
  [[-16.8, -16.8], [-16.8, 16.8], [16.8, -16.8], [16.8, 16.8]].forEach(([cx, cz]) => {
    addBox(5.2, wallH + 2.5, 5.2, cx, wallMidY + 1.0, cz, matStoneLight);
  });
  // 4 toitures de bras séparées laissant le puits central [-15..+15] entièrement libre pour la Triple Coupole !
  addBox(21.5, 3.6, 28, -25.8, WALL_TOP_Y + 3.1, 0, matLeadDome); // Bras Ouest
  addBox(31.5, 3.6, 28, +30.8, WALL_TOP_Y + 3.1, 0, matLeadDome); // Bras Est
  addBox(28, 3.6, 25.0, 0, WALL_TOP_Y + 3.1, -27.6, matLeadDome); // Bras Nord
  addBox(28, 3.6, 25.0, 0, WALL_TOP_Y + 3.1, +27.6, matLeadDome); // Bras Sud

  /**
   * ==========================================================================
   * 2. LE GRAND PÉRISTYLE CORINTHIEN (22 COLONNES), FRISE DORÉE & FRONTON DAVID D'ANGERS
   * ==========================================================================
   */
  const colH = 19.2;
  // Rangée avant (6 colonnes colossales à x = -52.8)
  const frontZ = [-16.0, -9.8, -3.6, 3.6, 9.8, 16.0];
  frontZ.forEach((cz) => addCorinthianColumn(-52.8, FLOOR_Y, cz, colH, 0.94, 0.80, exteriorGroup, true));
  // 2e rangée (6 colonnes à x = -46.2)
  frontZ.forEach((cz) => addCorinthianColumn(-46.2, FLOOR_Y, cz, colH, 0.92, 0.78, exteriorGroup, true));
  // Colonnes latérales de retour & vestibule profond (10 colonnes : 4 par côté + 2 encadrant la porte centrale)
  [-16.0, 16.0].forEach((cz) => {
    addCorinthianColumn(-40.2, FLOOR_Y, cz, colH, 0.92, 0.78, exteriorGroup, true);
    addCorinthianColumn(-49.5, FLOOR_Y, cz, colH, 0.92, 0.78, exteriorGroup, true);
  });
  [-9.8, -3.8, 3.8, 9.8].forEach((cz) => {
    addCorinthianColumn(-40.2, FLOOR_Y, cz, colH, 0.90, 0.76, exteriorGroup, true);
  });
  // 2 colonnes engagées aux angles du mur de fond
  [-16.0, 16.0].forEach((cz) => addCorinthianColumn(-37.8, FLOOR_Y, cz, colH, 0.90, 0.76, exteriorGroup, false));

  // Entablement complet du Portique (architrave + frise gravée dorée + corniche à denticules)
  addBox(19.2, 1.35, 36.8, -45.4, FLOOR_Y + colH + 0.65, 0, matStoneLight); // Architrave
  addBox(18.8, 2.35, 36.4, -45.4, FLOOR_Y + colH + 2.5, 0, matStone);       // Corps de frise
  // Panneau avant portant l'inscription dorée « AUX GRANDS HOMMES LA PATRIE RECONNAISSANTE »
  const friezeFront = new THREE.Mesh(new THREE.PlaneGeometry(36.2, 2.3), matFrieze);
  friezeFront.position.set(-54.88, FLOOR_Y + colH + 2.5, 0);
  friezeFront.rotation.y = -Math.PI * 0.5;
  exteriorGroup.add(friezeFront);
  // Corniche saillante horizontale
  addBox(20.6, 1.05, 38.8, -45.4, FLOOR_Y + colH + 4.15, 0, matStoneLight);

  // --- FRONTON TRIANGULAIRE SCULPTÉ DE DAVID D'ANGERS (1837) ---
  const pedBaseY = FLOOR_Y + colH + 4.65; // y = 26.25 m
  const pedW = 37.6;
  const pedH = 7.4;

  const pedOuter = new THREE.Shape();
  pedOuter.moveTo(-pedW * 0.5, 0);
  pedOuter.lineTo(pedW * 0.5, 0);
  pedOuter.lineTo(0, pedH);
  pedOuter.closePath();

  const pedExtrude = new THREE.Mesh(
    new THREE.ExtrudeGeometry(pedOuter, { depth: 18.2, bevelEnabled: false }),
    matStone
  );
  pedExtrude.rotation.y = Math.PI * 0.5;
  pedExtrude.position.set(-54.4, pedBaseY, 0);
  pedExtrude.castShadow = true;
  pedExtrude.receiveShadow = true;
  exteriorGroup.add(pedExtrude);

  // Tympan creusé & corniches rampantes saillantes encadrant les sculptures
  const slopeAngle = Math.atan2(pedH, pedW * 0.5);
  const rakingLen = Math.hypot(pedW * 0.5 + 0.9, pedH + 0.35);
  [-1, 1].forEach((side) => {
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(20.8, 1.05, rakingLen), matStoneLight);
    cornice.position.set(-45.4, pedBaseY + pedH * 0.5 + 0.32, side * (pedW * 0.25 + 0.2));
    cornice.rotation.x = side * slopeAngle;
    cornice.castShadow = true;
    exteriorGroup.add(cornice);
  });

  // Tympan creusé texturé en bas-relief pierre + figures 3D drapées de David d'Angers (ton calcaire harmonieux)
  const tympShape = new THREE.Shape();
  tympShape.moveTo(-(pedW * 0.45), 0.15);
  tympShape.lineTo(pedW * 0.45, 0.15);
  tympShape.lineTo(0, pedH - 0.55);
  tympShape.closePath();
  const tympGeo = new THREE.ShapeGeometry(tympShape);
  const posT = tympGeo.attributes.position;
  const uvT = tympGeo.attributes.uv;
  for (let i = 0; i < posT.count; i++) {
    uvT.setXY(i, (posT.getX(i) + pedW * 0.45) / (pedW * 0.9), posT.getY(i) / (pedH - 0.55));
  }
  const tympMesh = new THREE.Mesh(tympGeo, matPedimentRelief);
  tympMesh.rotation.y = -Math.PI * 0.5;
  tympMesh.position.set(-54.44, pedBaseY, 0);
  exteriorGroup.add(tympMesh);

  const tympX = -54.72;
  const addPedimentSculpture = (pz, hFig, pose = 'stand') => {
    const g = new THREE.Group();
    g.position.set(tympX, pedBaseY + 0.18, pz);
    const bodyH = hFig * 0.68;
    // Socle & drapé sculpté en calcaire clair assorti au fronton (épaules + taille + manteau)
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(hFig * 0.085, hFig * 0.155, bodyH * 0.65, 8), matStoneLight);
    skirt.position.y = bodyH * 0.32;
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(hFig * 0.12, hFig * 0.09, bodyH * 0.42, 8), matStoneLight);
    torso.position.y = bodyH * 0.80;
    const head = new THREE.Mesh(new THREE.SphereGeometry(hFig * 0.075, 8, 8), matStoneLight);
    head.position.set(-0.12, bodyH + hFig * 0.09, 0);
    if (pose === 'kneelL' || pose === 'kneelR') {
      const s = pose === 'kneelL' ? 1 : -1;
      skirt.rotation.x = s * 0.55;
      skirt.position.set(0, hFig * 0.24, s * 0.25);
      torso.rotation.x = s * 0.25;
      torso.position.set(-0.06, hFig * 0.52, -s * 0.12);
      head.position.set(-0.12, hFig * 0.78, -s * 0.22);
    }
    g.add(skirt, torso, head);
    if (pose === 'patrie') {
      // Autel de la Patrie + bras ouverts distribuant les couronnes de laurier dorées
      addBox(0.55, 1.4, 1.3, 0.08, 0.7, 0, matStoneWarm, { cast: false, parent: g });
      [-1, 1].forEach((s) => {
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 1.75, 6), matStoneLight);
        arm.position.set(-0.22, bodyH * 0.90, s * 1.05);
        arm.rotation.x = s * 1.28;
        g.add(arm);
        const wreath = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.07, 6, 12), matGold);
        wreath.rotation.y = Math.PI * 0.5;
        wreath.position.set(-0.34, bodyH * 0.92, s * 1.92);
        g.add(wreath);
      });
    }
    exteriorGroup.add(g);
  };
  addPedimentSculpture(0, 5.8, 'patrie');     // La Patrie
  addPedimentSculpture(-2.35, 4.7, 'stand');  // La Liberté
  addPedimentSculpture(+2.35, 4.7, 'stand');  // L'Histoire
  addPedimentSculpture(-4.6, 4.1, 'stand');   // Voltaire / Rousseau / Cuvier
  addPedimentSculpture(+4.6, 4.1, 'stand');   // Bonaparte / Laplace / Monge
  addPedimentSculpture(-7.2, 3.3, 'kneelL');  // Figures inclinées de gauche
  addPedimentSculpture(+7.2, 3.3, 'kneelR');  // Figures inclinées de droite
  addPedimentSculpture(-10.4, 2.3, 'kneelL'); // Écoinçon gauche
  addPedimentSculpture(+10.4, 2.3, 'kneelR'); // Écoinçon droit

  // Plafond à caissons sous le Péristyle
  for (let cx = -51.5; cx <= -39.5; cx += 4.0) {
    for (let cz = -14; cz <= 14; cz += 4.6) {
      addBox(3.4, 0.35, 4.0, cx, FLOOR_Y + colH + 0.15, cz, matStoneWarm, { cast: false });
    }
  }

  /**
   * ==========================================================================
   * 3. LE DÔME MONUMENTAL DE 83 MÈTRES & SA COLONNADE PÉRIPTÈRE (32 COLONNES LIBRES)
   *    (100 % CREUX AU CENTRE POUR VOIR LA TRIPLE COUPOLE & L'OCULUS DEPUIS LA NEF !)
   * ==========================================================================
   */
  // Helper anneau circulaire creux extrudé (laisse le puits de la coupole 100 % ouvert !)
  function addHollowRing(rInner, rOuter, height, yBottom, mat, parent = exteriorGroup) {
    const sh = new THREE.Shape();
    sh.absarc(0, 0, rOuter, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, rInner, 0, Math.PI * 2, true);
    sh.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: height, bevelEnabled: false, curveSegments: 32 });
    geo.rotateX(-Math.PI * 0.5);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = yBottom;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  // A. Socle carré CREUX de transition (y = 24.4 -> 34.0 m — 4 murs périphériques + 4 contreforts d'angle)
  addBox(34.8, 9.6, 4.0, 0, 29.2, -15.4, matStone);
  addBox(34.8, 9.6, 4.0, 0, 29.2, +15.4, matStone);
  addBox(4.0, 9.6, 26.8, -15.4, 29.2, 0, matStone);
  addBox(4.0, 9.6, 26.8, +15.4, 29.2, 0, matStone);
  addBox(36.0, 1.1, 4.6, 0, 33.8, -15.7, matStoneLight);
  addBox(36.0, 1.1, 4.6, 0, 33.8, +15.7, matStoneLight);
  addBox(4.6, 1.1, 27.0, -15.7, 33.8, 0, matStoneLight);
  addBox(4.6, 1.1, 27.0, +15.7, 33.8, 0, matStoneLight);
  // 4 contreforts d'angle en escalier
  [[-16.4, -16.4], [16.4, -16.4], [16.4, 16.4], [-16.4, 16.4]].forEach(([bx, bz]) => {
    addBox(5.2, 9.8, 5.2, bx, 29.3, bz, matStoneLight);
  });

  // B. Tambour cylindrique intérieur OUVERT (R = 12.2 m, percé de 16 hautes fenêtres éclairant le dôme !)
  const drumBaseY = 34.0;
  const drumH = 17.5; // -> y = 51.5 m (Galerie panoramique !)
  const drumCyl = new THREE.Mesh(new THREE.CylinderGeometry(12.2, 12.4, drumH, 32, 1, true), matStone);
  drumCyl.position.y = drumBaseY + drumH * 0.5;
  drumCyl.castShadow = true;
  drumCyl.receiveShadow = true;
  exteriorGroup.add(drumCyl);

  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.9, 8.8, 0.45), matWindowGlass);
    win.position.set(Math.cos(a) * 12.35, drumBaseY + 9.2, Math.sin(a) * 12.35);
    win.rotation.y = -a + Math.PI * 0.5;
    exteriorGroup.add(win);
  }

  // C. Colonnade périptère célèbre : 32 COLONNES CORINTHIENNES LIBRES + 4 contreforts diagonaux (R = 14.9 m)
  const colRingR = 14.9;
  const drumColBaseY = drumBaseY + 1.2;
  const drumColH = 14.2;
  // Anneau soubassement circulaire CREUX (laisse le puits R < 11.4 m totalement ouvert !)
  addHollowRing(11.6, 16.5, 1.4, drumBaseY, matStoneLight);

  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    const cx = Math.cos(a) * colRingR;
    const cz = Math.sin(a) * colRingR;
    if (i % 8 === 4) {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(2.8, drumColH + 0.6, 2.8), matStoneLight);
      pier.position.set(cx, drumColBaseY + drumColH * 0.5, cz);
      pier.rotation.y = -a;
      pier.castShadow = true;
      exteriorGroup.add(pier);
    } else {
      addCorinthianColumn(cx, drumColBaseY, cz, drumColH, 0.58, 0.50, exteriorGroup, false);
    }
  }

  // Entablement circulaire CREUX & Galerie Panoramique visitable à y = 51.5 m !
  const BELVEDERE_Y = 51.5;
  addHollowRing(11.6, 16.5, 2.2, BELVEDERE_Y - 2.2, matStoneLight);
  // Balustrade de la galerie panoramique (R = 16.1 m)
  const belvRailTop = new THREE.Mesh(new THREE.TorusGeometry(16.1, 0.22, 8, 48), matStoneLight);
  belvRailTop.rotation.x = Math.PI * 0.5;
  belvRailTop.position.y = BELVEDERE_Y + 1.25;
  exteriorGroup.add(belvRailTop);
  for (let k = 0; k < 48; k++) {
    const a = (k / 48) * Math.PI * 2;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.13, 1.2, 6), matStoneLight);
    post.position.set(Math.cos(a) * 16.1, BELVEDERE_Y + 0.6, Math.sin(a) * 16.1);
    exteriorGroup.add(post);
  }

  // D. Tambour attique supérieur OUVERT (y = 51.5 -> 58.6 m, R = 12.1 m, percé de 16 fenêtres cintrées)
  const atticH = 7.1;
  const atticCyl = new THREE.Mesh(new THREE.CylinderGeometry(11.9, 12.2, atticH, 32, 1, true), matStone);
  atticCyl.position.y = BELVEDERE_Y + atticH * 0.5;
  atticCyl.castShadow = true;
  exteriorGroup.add(atticCyl);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + Math.PI / 16;
    const aw = new THREE.Mesh(new THREE.BoxGeometry(1.7, 3.8, 0.45), matWindowGlass);
    aw.position.set(Math.cos(a) * 12.05, BELVEDERE_Y + 3.4, Math.sin(a) * 12.05);
    aw.rotation.y = -a + Math.PI * 0.5;
    exteriorGroup.add(aw);
    const ap = new THREE.Mesh(new THREE.BoxGeometry(0.65, atticH, 0.55), matStoneLight);
    const pa = (i / 16) * Math.PI * 2;
    ap.position.set(Math.cos(pa) * 12.15, BELVEDERE_Y + atticH * 0.5, Math.sin(pa) * 12.15);
    ap.rotation.y = -pa + Math.PI * 0.5;
    exteriorGroup.add(ap);
  }
  const domeSpringY = BELVEDERE_Y + atticH; // y = 58.6 m
  addHollowRing(11.2, 12.6, 0.9, domeSpringY - 0.45, matStoneLight);

  // E. Grande Coupole en plomb patiné (y = 58.6 -> 73.2 m) + 16 nervures saillantes convergeant vers le lanterneau !
  const domeProfile = [];
  const domeSteps = 18;
  const domeH = 14.6;
  const domeR = 11.8;
  for (let i = 0; i <= domeSteps; i++) {
    const t = i / domeSteps;
    const phi = t * Math.PI * 0.48;
    // Profil légèrement surhaussé (ogive classique de Soufflot)
    const r = Math.max(2.9, domeR * Math.cos(phi));
    const y = domeSpringY + Math.pow(Math.sin(phi), 0.92) * domeH;
    domeProfile.push(new THREE.Vector2(r, y));
  }
  const mainDomeGeo = new THREE.LatheGeometry(domeProfile, 36);
  const mainDomeMesh = new THREE.Mesh(mainDomeGeo, matLeadDome);
  mainDomeMesh.castShadow = true;
  mainDomeMesh.receiveShadow = true;
  exteriorGroup.add(mainDomeMesh);

  // 16 nervures courbes en pierre/plomb épousant exactement le profil de la coupole !
  for (let rIdx = 0; rIdx < 16; rIdx++) {
    const a = (rIdx / 16) * Math.PI * 2;
    const pts = domeProfile.map((v) => new THREE.Vector3(Math.cos(a) * (v.x + 0.18), v.y, Math.sin(a) * (v.x + 0.18)));
    const curve = new THREE.CatmullRomCurve3(pts);
    const ribMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 14, 0.24, 6, false), matStoneLight);
    exteriorGroup.add(ribMesh);
  }

  // F. Lanterneau ajouré à 8 colonnettes + petit dôme + Croix dorée culminant à exactement 83,0 m !
  const lantBaseY = domeSpringY + domeH; // y = 73.2 m
  const lantBase = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.6, 1.1, 16), matStoneLight);
  lantBase.position.y = lantBaseY + 0.4;
  exteriorGroup.add(lantBase);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const lc = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 4.4, 8), matStoneLight);
    lc.position.set(Math.cos(a) * 2.75, lantBaseY + 3.0, Math.sin(a) * 2.75);
    exteriorGroup.add(lc);
  }
  const lantCore = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 4.0, 12), matWindowGlass);
  lantCore.position.y = lantBaseY + 2.9;
  exteriorGroup.add(lantCore);
  const lantCornice = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.1, 0.75, 16), matStoneLight);
  lantCornice.position.y = lantBaseY + 5.3;
  exteriorGroup.add(lantCornice);
  const lantCupola = new THREE.Mesh(
    new THREE.SphereGeometry(2.75, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
    matLeadDome
  );
  lantCupola.position.y = lantBaseY + 5.6;
  exteriorGroup.add(lantCupola);
  // Boule dorée & Croix sommitale à 83,0 m exacts !
  const topOrb = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), matGold);
  topOrb.position.y = 80.2;
  exteriorGroup.add(topOrb);
  addBox(0.24, 3.0, 0.24, 0, 81.5, 0, matGold);
  addBox(0.24, 0.24, 1.85, 0, 81.9, 0, matGold);

  /**
   * ==========================================================================
   * 4. INTÉRIEUR VISITABLE : MARBRE POLYCHROME, COLONNADES CORINTHIENNES,
   *    TRIPLE COUPOLE À OCULUS, FRESQUES, CONVENTION NATIONALE & PENDULE DE FOUCAULT
   * ==========================================================================
   */
  // Sol intérieur en marbre polychrome (y = FLOOR_Y = 2.40 m)
  addBox(82.0, 0.14, 32.0, 5.5, FLOOR_Y - 0.04, 0, matMarbleFloor, { cast: false, parent: interiorGroup });
  addBox(32.0, 0.14, 80.0, 0, FLOOR_Y - 0.04, 0, matMarbleFloor, { cast: false, parent: interiorGroup });

  // 4 Piliers triangulaires colossaux de la Croisée du Dôme (laissant un carré central ouvert de 22 m !)
  [[-13.8, -13.8], [13.8, -13.8], [13.8, 13.8], [-13.8, 13.8]].forEach(([px, pz]) => {
    addBox(5.8, 25.0, 5.8, px, FLOOR_Y + 12.5, pz, matStoneLight, { parent: interiorGroup });
    // Pilastres cannelés encadrant chaque pilier
    addBox(6.2, 1.2, 6.2, px, FLOOR_Y + 24.4, pz, matStoneWarm, { parent: interiorGroup });
    registerLocalBoxCollider(px - 3.0, px + 3.0, pz - 3.0, pz + 3.0);
  });

  // Colonnades corinthiennes intérieures longeant les 4 bras de la croix grecque (44 colonnes !)
  const intColH = 14.8;
  // Bras Ouest (-31, -26, -21) & Bras Est (+21, +26, +31, +36, +41)
  [-31, -26, -21, 21, 26, 31, 36, 41].forEach((cx) => {
    [-11.2, 11.2].forEach((cz) => {
      addCorinthianColumn(cx, FLOOR_Y, cz, intColH, 0.62, 0.52, interiorGroup, true);
    });
  });
  // Bras Nord & Sud (±21, ±26, ±31, ±36)
  [-36, -31, -26, -21, 21, 26, 31, 36].forEach((cz) => {
    [-11.2, 11.2].forEach((cx) => {
      addCorinthianColumn(cx, FLOOR_Y, cz, intColH, 0.62, 0.52, interiorGroup, true);
    });
  });
  // Entablements intérieurs portés par les colonnades (y = 17.4 m)
  [-11.2, 11.2].forEach((cz) => {
    addBox(16, 1.4, 1.8, -26, FLOOR_Y + intColH + 0.7, cz, matStoneLight, { parent: interiorGroup });
    addBox(26, 1.4, 1.8, +31, FLOOR_Y + intColH + 0.7, cz, matStoneLight, { parent: interiorGroup });
  });
  [-11.2, 11.2].forEach((cx) => {
    addBox(1.8, 1.4, 21, cx, FLOOR_Y + intColH + 0.7, -28.5, matStoneLight, { parent: interiorGroup });
    addBox(1.8, 1.4, 21, cx, FLOOR_Y + intColH + 0.7, +28.5, matStoneLight, { parent: interiorGroup });
  });

  // Voûtes intérieures à caissons des 4 bras (y = 24.0 m) + 4 grands arcs triomphaux de la croisée
  [[-26, 0, 20, 22], [31, 0, 30, 22], [0, -28.5, 22, 22], [0, 28.5, 22, 22]].forEach(([vx, vz, vw, vd]) => {
    addBox(vw, 0.6, vd, vx, 24.0, vz, matInteriorVault, { cast: false, parent: interiorGroup });
    // Coupole surbaissée à caissons au centre de chaque bras
    const saucer = new THREE.Mesh(
      new THREE.SphereGeometry(8.6, 18, 8, 0, Math.PI * 2, 0, Math.PI * 0.42),
      matInteriorVault
    );
    saucer.scale.set(1, 0.42, 1);
    saucer.position.set(vx, 23.6, vz);
    interiorGroup.add(saucer);
  });

  // --- LA FAMEUSE TRIPLE COUPOLE DE SOUFFLOT (OCULUS OUVERT -> APOTHÉOSE DE SAINTE-GENEVIÈVE !) ---
  // 1) Tambour intérieur de la croisée (y = 24 -> 34.5 m, R = 11.4 m)
  const intDrum = new THREE.Mesh(
    new THREE.CylinderGeometry(11.4, 11.4, 11.0, 32, 1, true),
    matInteriorVault
  );
  intDrum.position.y = 29.2;
  interiorGroup.add(intDrum);
  const intCornice = new THREE.Mesh(new THREE.TorusGeometry(11.3, 0.55, 8, 36), matStoneLight);
  intCornice.rotation.x = Math.PI * 0.5;
  intCornice.position.y = 34.4;
  interiorGroup.add(intCornice);

  // 2) Coupole inférieure à caissons percée d'un GRAND OCULUS CENTRAL (R = 6.2 m à y = 48.2 m !)
  const innerShellPts = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const phi = THREE.MathUtils.lerp(0.0, 1.02, t);
    innerShellPts.push(new THREE.Vector2(11.4 * Math.cos(phi), 34.4 + Math.sin(phi) * 16.0));
  }
  const innerShellMesh = new THREE.Mesh(new THREE.LatheGeometry(innerShellPts, 32), matInteriorVault);
  interiorGroup.add(innerShellMesh);
  // Anneau doré bordant l'oculus ouvert
  const oculusRing = new THREE.Mesh(new THREE.TorusGeometry(6.15, 0.35, 8, 32), matGold);
  oculusRing.rotation.x = Math.PI * 0.5;
  oculusRing.position.y = 48.1;
  interiorGroup.add(oculusRing);

  // 3) Seconde coupole peinte visible PAR L'OCULUS : L'Apothéose de Sainte-Geneviève (Gros, 1824) à y = 51..66.5 m !
  const paintedDome = new THREE.Mesh(
    new THREE.SphereGeometry(10.8, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.54),
    matApotheosis
  );
  paintedDome.scale.set(1, 1.38, 1);
  paintedDome.position.y = 51.8;
  interiorGroup.add(paintedDome);

  // --- CYCLES DE FRESQUES MURALES (PUVIS DE CHAVANNES : LA VIE DE SAINTE GENEVIÈVE) ---
  [
    { x: -26, z: -15.35, w: 17.5, ry: 0, mat: matMuralGen },
    { x: -26, z: +15.35, w: 17.5, ry: Math.PI, mat: matMuralHist },
    { x: +29, z: -15.35, w: 21.0, ry: 0, mat: matMuralGen },
    { x: +29, z: +15.35, w: 21.0, ry: Math.PI, mat: matMuralHist },
    { x: -15.35, z: -28.5, w: 18.0, ry: Math.PI * 0.5, mat: matMuralHist },
    { x: +15.35, z: -28.5, w: 18.0, ry: -Math.PI * 0.5, mat: matMuralGen },
    { x: -15.35, z: +28.5, w: 18.0, ry: Math.PI * 0.5, mat: matMuralGen },
    { x: +15.35, z: +28.5, w: 18.0, ry: -Math.PI * 0.5, mat: matMuralHist },
  ].forEach(({ x, z, w, ry, mat }) => {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, 7.6), mat);
    panel.position.set(x, FLOOR_Y + 6.4, z);
    panel.rotation.y = ry;
    interiorGroup.add(panel);
  });

  // --- GROUPE SCULPTÉ DE LA CONVENTION NATIONALE (SICARD, 1924) & DESCENTE VERS LA CRYPTE (CHŒUR EST) ---
  {
    const convX = 36.5;
    // Estrade en marbre blanc à degrés moulurés
    addBox(11.6, 0.85, 15.2, convX, FLOOR_Y + 0.42, 0, matMarbleWhite, { parent: interiorGroup });
    addBox(9.4, 0.85, 12.4, convX + 0.6, FLOOR_Y + 1.26, 0, matMarbleWhite, { parent: interiorGroup });
    addBox(7.2, 0.55, 9.6, convX + 1.0, FLOOR_Y + 1.94, 0, matStoneLight, { parent: interiorGroup });
    // Stèle triomphale sculptée à pilastres, corniche & trophée doré
    addBox(2.2, 8.2, 6.8, convX + 2.2, FLOOR_Y + 6.2, 0, matMarbleWhite, { parent: interiorGroup });
    addBox(2.8, 0.75, 7.6, convX + 2.2, FLOOR_Y + 10.5, 0, matStoneLight, { parent: interiorGroup });
    [-3.1, 3.1].forEach((pz) => {
      addBox(2.6, 8.0, 0.75, convX + 2.2, FLOOR_Y + 6.2, pz, matStoneLight, { parent: interiorGroup });
    });
    // Figure héroïque centrale de la République drapée + épaules, manteau & bras levé + faisceau doré
    const addClassicalMarbleFigure = (fx, fy, fz, h, raisedArm = false) => {
      const skirt = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.10, h * 0.18, h * 0.58, 10), matMarbleWhite);
      skirt.position.set(fx, fy + h * 0.29, fz);
      interiorGroup.add(skirt);
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.14, h * 0.10, h * 0.30, 10), matMarbleWhite);
      torso.position.set(fx, fy + h * 0.72, fz);
      interiorGroup.add(torso);
      const head = new THREE.Mesh(new THREE.SphereGeometry(h * 0.085, 10, 8), matMarbleWhite);
      head.position.set(fx, fy + h * 0.94, fz);
      interiorGroup.add(head);
      if (raisedArm) {
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, h * 0.38, 6), matMarbleWhite);
        arm.position.set(fx - 0.35, fy + h * 0.92, fz + 0.55);
        arm.rotation.x = 0.65;
        interiorGroup.add(arm);
        const sword = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.9, 6), matGold);
        sword.position.set(fx - 0.45, fy + h * 1.08, fz + 0.85);
        interiorGroup.add(sword);
      }
    };
    addClassicalMarbleFigure(convX + 0.6, FLOOR_Y + 2.2, 0, 5.4, true);
    [-2.5, -1.25, 1.25, 2.5].forEach((fz, i) => {
      addClassicalMarbleFigure(convX - 0.65, FLOOR_Y + 2.1, fz, 3.55 + (i % 2) * 0.35, i === 1 || i === 2);
    });
    // Mosaïque byzantine dorée & bleu outremer d'Ernest Hébert (L'Ange de la France, 1884) au fond de l'abside Est
    const apseArc = new THREE.Mesh(new THREE.CircleGeometry(7.6, 24, 0, Math.PI), matApseMosaic);
    apseArc.rotation.y = -Math.PI * 0.5;
    apseArc.position.set(45.65, FLOOR_Y + 12.2, 0);
    interiorGroup.add(apseArc);
    const apseFrame = new THREE.Mesh(new THREE.TorusGeometry(7.65, 0.38, 8, 24, Math.PI), matGold);
    apseFrame.rotation.y = -Math.PI * 0.5;
    apseFrame.position.set(45.55, FLOOR_Y + 12.2, 0);
    interiorGroup.add(apseFrame);

    // Balustrades marbre & portail doré marquant la descente vers la Crypte des Grands Hommes (côtés Nord/Sud du Chœur)
    [-9.4, 9.4].forEach((cz) => {
      addBox(7.2, 1.15, 0.45, 40.5, FLOOR_Y + 0.58, cz, matStoneLight, { parent: interiorGroup });
      addBox(0.35, 3.6, 3.2, 44.2, FLOOR_Y + 1.8, cz + (cz > 0 ? 2.2 : -2.2), matGold, { parent: interiorGroup });
    });
    registerLocalBoxCollider(convX - 5.2, convX + 5.2, -7.2, 7.2);
  }

  // --- LE PENDULE DE FOUCAULT (1851) : CADRAN GRADUÉ FIXE + PENDULE ANIMÉ DE 63 MÈTRES ! ---
  // Cadran circulaire en marbre & bois (R = 4.6 m) + barrière cordon velours rouge + 16 colonnettes laiton
  const dialBase = new THREE.Mesh(new THREE.CylinderGeometry(4.75, 4.95, 0.36, 36), matBronze);
  dialBase.position.set(0, FLOOR_Y + 0.18, 0);
  interiorGroup.add(dialBase);
  const dialTop = new THREE.Mesh(new THREE.CylinderGeometry(4.55, 4.55, 0.06, 36), matFoucaultDial);
  dialTop.position.set(0, FLOOR_Y + 0.38, 0);
  interiorGroup.add(dialTop);
  const dialRim = new THREE.Mesh(new THREE.TorusGeometry(4.62, 0.10, 8, 36), matGold);
  dialRim.rotation.x = Math.PI * 0.5;
  dialRim.position.set(0, FLOOR_Y + 0.42, 0);
  interiorGroup.add(dialRim);
  // Barrière de protection & cordon velours autour du pendule (R = 5.4 m)
  const cordRing = new THREE.Mesh(new THREE.TorusGeometry(5.45, 0.055, 6, 36), matVelvetCord);
  cordRing.rotation.x = Math.PI * 0.5;
  cordRing.position.set(0, FLOOR_Y + 0.96, 0);
  interiorGroup.add(cordRing);
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 1.08, 6), matGold);
    st.position.set(Math.cos(a) * 5.45, FLOOR_Y + 0.54, Math.sin(a) * 5.45);
    interiorGroup.add(st);
  }
  registerLocalCircleCollider(0, 0, 5.6);

  // Pendule animé suspendu au sommet exact de la seconde coupole (y = 66.2 m -> sphère à y = 3.25 m !)
  const PENDULUM_PIVOT_Y = 66.2;
  const PENDULUM_LEN = 62.9;
  const pendulumPivot = new THREE.Group();
  pendulumPivot.position.set(0, PENDULUM_PIVOT_Y, 0);
  pendulumPivot.userData.noMerge = true;
  root.add(pendulumPivot);

  const wireMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.032, PENDULUM_LEN, 6),
    matGold
  );
  wireMesh.position.y = -PENDULUM_LEN * 0.5;
  pendulumPivot.add(wireMesh);

  const bobMesh = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), matGold);
  bobMesh.position.y = -PENDULUM_LEN;
  pendulumPivot.add(bobMesh);

  const needleMesh = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.36, 8), matGold);
  needleMesh.rotation.x = Math.PI;
  needleMesh.position.y = -PENDULUM_LEN - 0.54;
  pendulumPivot.add(needleMesh);

  // Lumières intérieures + projecteurs architecturaux nocturnes sur le Portique & le Dôme (83 m)
  const interiorLights = [
    new THREE.PointLight(0xffe1a8, 0, 65, 1.3),
    new THREE.PointLight(0xfff0cc, 0, 55, 1.2),
  ];
  interiorLights[0].position.set(0, 18, 0);   // Croisée & Pendule de Foucault
  interiorLights[1].position.set(32, 16, 0);  // Chœur & Convention Nationale
  const facadeNightLights = [
    new THREE.PointLight(0xffcb7a, 0, 95, 1.25), // Illumination chaude du Portique & Fronton David d'Angers
    new THREE.PointLight(0xffd690, 0, 88, 1.25), // Illumination de la Colonnade du Dôme
  ];
  facadeNightLights[0].position.set(-64, 15, 0);
  facadeNightLights[1].position.set(-22, 47, 14);
  root.add(interiorLights[0], interiorLights[1], facadeNightLights[0], facadeNightLights[1]);

  // Fusion haute performance de tout l'extérieur et tout l'intérieur du Panthéon !
  mergeStaticGroupByMaterial(exteriorGroup);
  mergeStaticGroupByMaterial(interiorGroup);

  /**
   * ==========================================================================
   * 5. PLACE DU PANTHÉON & ENSEMBLE HISTORIQUE DU QUARTIER LATIN
   *    - Parvis pavé & grilles en fer forgé
   *    - Façades courbes jumelles de Soufflot (Faculté de Droit & Mairie du 5e)
   *    - Bibliothèque Sainte-Geneviève (Labrouste, 1850)
   *    - Église Saint-Étienne-du-Mont (façade Renaissance & clocher)
   *    - Lycée Henri-IV & Tour Clovis (vestige roman de l'Abbaye Sainte-Geneviève)
   * ==========================================================================
   */
  // Grand plateau pavé de la Place du Panthéon (ancré jusqu'à -3 m sur les bords pour zéro vide sur la colline !)
  addBox(228, 3.0, 174, -8, -1.46, 0, matCobble, { cast: false, parent: envGroup });
  // Chaussée circulaire entourant le Panthéon & raccordement axial de la Rue Soufflot (-X)
  addBox(74, 0.14, 24, -104, 0.08, 0, matAsphalt, { cast: false, parent: envGroup });
  addBox(140, 0.14, 15, 4, 0.08, -56, matAsphalt, { cast: false, parent: envGroup });
  addBox(140, 0.14, 15, 4, 0.08, +56, matAsphalt, { cast: false, parent: envGroup });
  addBox(15, 0.14, 126, +66, 0.08, 0, matAsphalt, { cast: false, parent: envGroup });

  // Grille basse en fer forgé & bornes en pierre entourant le parvis immédiat
  for (let gx = -66; gx <= 56; gx += 6) {
    [-46, 46].forEach((gz) => {
      addBox(0.32, 1.35, 0.32, gx, 0.68, gz, matIronFence, { cast: false, parent: envGroup });
    });
  }
  addBox(122, 0.14, 0.16, -5, 1.25, -46, matIronFence, { cast: false, parent: envGroup });
  addBox(122, 0.14, 0.16, -5, 1.25, +46, matIronFence, { cast: false, parent: envGroup });

  // A. Les 2 Façades Courbes Symétriques de Soufflot (Faculté de Droit au Nord-Ouest & Mairie du 5e au Sud-Ouest)
  [-1, 1].forEach((sideZ) => {
    const wing = new THREE.Group();
    wing.position.set(-82, 0, sideZ * 62);
    // Courbure concave tournée vers le centre de la Place du Panthéon !
    wing.rotation.y = -sideZ * 0.48;
    // Corps principal avec fondation profonde (-4 m)
    addBox(48, 22, 22, 0, 7.0, 0, matCivicTex, { parent: wing });
    addBox(49, 1.0, 23, 0, 18.2, 0, matStoneLight, { parent: wing });
    addBox(46, 4.4, 19, 0, 20.6, 0, matSlate, { parent: wing });
    // Portique central à 4 colonnes ioniques, socle & fronton triangulaire face à la place !
    const portZ = -sideZ * 12.2;
    addBox(16.5, 2.2, 3.6, 0, -0.6, portZ, matStoneWarm, { parent: wing });
    [-6, -2, 2, 6].forEach((px) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.52, 13.5, 10), matStoneLight);
      col.position.set(px, 7.2, portZ);
      wing.add(col);
    });
    addBox(16, 1.4, 3.2, 0, 14.5, portZ + sideZ * 0.6, matStoneLight, { parent: wing });
    const pedS = new THREE.Shape();
    pedS.moveTo(-8.2, 0);
    pedS.lineTo(8.2, 0);
    pedS.lineTo(0, 3.0);
    pedS.closePath();
    const pedM = new THREE.Mesh(new THREE.ExtrudeGeometry(pedS, { depth: 2.2, bevelEnabled: false }), matStoneLight);
    pedM.position.set(0, 15.2, portZ - 1.1);
    wing.add(pedM);
    envGroup.add(wing);
  });

  // B. Bibliothèque Sainte-Geneviève (Henri Labrouste, 1850 — bordure Nord z = -75, x = -20..+64)
  {
    const lib = new THREE.Group();
    lib.position.set(22, 0, -76);
    addBox(86, 20, 20, 0, 6.5, 0, matLibraryTex, { parent: lib });
    addBox(87.5, 1.1, 21.5, 0, 16.8, 0, matStoneLight, { parent: lib });
    addBox(84, 3.8, 17.5, 0, 19.2, 0, matSlate, { parent: lib });
    envGroup.add(lib);
  }

  // C. Église Saint-Étienne-du-Mont (angle Nord-Est : façade Renaissance à 3 pignons superposés & Clocher !)
  {
    const sem = new THREE.Group();
    sem.position.set(86, 0, -56);
    sem.rotation.y = 0.28;
    // Nef principale & toiture ardoise pentue (fondation -5 m)
    addBox(44, 24, 22, 8, 7.0, 0, matStoneWarm, { parent: sem });
    const semRoof = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 15.5, 44, 3), matSlate);
    semRoof.rotation.z = Math.PI * 0.5;
    semRoof.rotation.x = Math.PI * 0.5;
    semRoof.scale.set(0.65, 1.0, 1.0);
    semRoof.position.set(8, 22.8, 0);
    sem.add(semRoof);
    // Façade occidentale Renaissance emblématique à 3 niveaux + rosace centrale + fronton triangulaire aigu
    addBox(3.6, 28, 18, -14.5, 9.5, 0, matStoneLight, { parent: sem });
    const semRose = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.1, 0.5, 16), matWindowGlass);
    semRose.rotation.z = Math.PI * 0.5;
    semRose.position.set(-16.4, 14.5, 0);
    sem.add(semRose);
    const semGable = new THREE.ConeGeometry(8.5, 9.5, 4);
    const semGableMesh = new THREE.Mesh(semGable, matStoneLight);
    semGableMesh.position.set(-14.5, 27.5, 0);
    semGableMesh.rotation.y = Math.PI * 0.25;
    semGableMesh.scale.set(0.32, 1, 1.05);
    sem.add(semGableMesh);
    // Haut Clocher carré au Nord de la façade + flèche fine (48 m)
    addBox(7.2, 40, 7.2, -9.0, 16.0, -12.2, matStoneLight, { parent: sem });
    const bellSpire = new THREE.Mesh(new THREE.ConeGeometry(3.4, 11.5, 8), matSlate);
    bellSpire.position.set(-9.0, 41.5, -12.2);
    sem.add(bellSpire);
    envGroup.add(sem);
  }

  // D. Lycée Henri-IV & la célèbre Tour Clovis (côté Sud-Est, x = +86, z = +46)
  {
    const h4 = new THREE.Group();
    h4.position.set(86, 0, 46);
    addBox(46, 20, 42, 6, 6.0, 0, matCivicTex, { parent: h4 });
    addBox(44, 4.5, 40, 6, 18.2, 0, matSlate, { parent: h4 });
    // Tour Clovis (clocher roman-gothique carré du XIIe siècle — 38 m !)
    addBox(8.6, 34, 8.6, -12, 13.5, -14, matStoneWarm, { parent: h4 });
    const clovisSpire = new THREE.Mesh(new THREE.ConeGeometry(5.6, 9.5, 4), matSlate);
    clovisSpire.position.set(-12, 35.2, -14);
    clovisSpire.rotation.y = Math.PI * 0.25;
    h4.add(clovisSpire);
    envGroup.add(h4);
  }

  // E. Immeubles Quartier Latin encadrant le côté Sud de la Place (z = +76, x = -22..+44)
  {
    const southRow = new THREE.Group();
    southRow.position.set(12, 0, 76);
    addBox(78, 21, 20, 0, 7.0, 0, matCivicTex, { parent: southRow });
    addBox(76, 4.2, 18, 0, 19.6, 0, matSlate, { parent: southRow });
    envGroup.add(southRow);
  }

  // F. Réverbères parisiens, bancs & alignement d'arbres autour de la Place du Panthéon & Rue Soufflot
  const lampCoords = [
    [-72, -14], [-72, 14], [-96, -14], [-96, 14], [-118, -14], [-118, 14],
    [-46, -48], [-12, -48], [22, -48], [52, -48],
    [-46, +48], [-12, +48], [22, +48], [52, +48],
  ];
  lampCoords.forEach(([lx, lz]) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.17, 4.4, 6), matLampIron);
    pole.position.set(lx, 2.2, lz);
    envGroup.add(pole);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.36, 8, 8), matLampGlow);
    globe.position.set(lx, 4.55, lz);
    envGroup.add(globe);
  });

  const treeCoords = [
    [-78, -17], [-96, -17], [-114, -17],
    [-78, +17], [-96, +17], [-114, +17],
    [-28, -62], [6, -62], [40, -62],
    [-28, +62], [6, +62], [40, +62],
    [60, -28], [60, 0], [60, +28],
  ];
  const matTrunk = new THREE.MeshStandardMaterial({ color: 0x4f3d2e, roughness: 0.92 });
  const matLeaf = new THREE.MeshStandardMaterial({ color: 0x497139, roughness: 0.86 });
  const trunksInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.24, 0.38, 4.4, 7), matTrunk, treeCoords.length);
  const crownsInst = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(2.9, 1), matLeaf, treeCoords.length * 2);
  const td = new THREE.Object3D();
  const cTint = new THREE.Color();
  treeCoords.forEach(([tx, tz], idx) => {
    td.position.set(tx, 2.2, tz);
    td.scale.set(1, 1, 1);
    td.updateMatrix();
    trunksInst.setMatrixAt(idx, td.matrix);
    [[0, 6.2, 0, 1.1], [1.2, 5.4, -0.8, 0.8]].forEach(([ox, oy, oz, sc], s) => {
      td.position.set(tx + ox, oy, tz + oz);
      td.scale.set(sc, sc * 0.88, sc);
      td.updateMatrix();
      const ci = idx * 2 + s;
      crownsInst.setMatrixAt(ci, td.matrix);
      const shade = 0.86 + ((ci * 23) % 14) * 0.016;
      cTint.setRGB(shade * 0.92, shade * 1.06, shade * 0.8);
      crownsInst.setColorAt(ci, cTint);
    });
  });
  trunksInst.instanceMatrix.needsUpdate = true;
  crownsInst.instanceMatrix.needsUpdate = true;
  if (crownsInst.instanceColor) crownsInst.instanceColor.needsUpdate = true;
  envGroup.add(trunksInst, crownsInst);

  mergeStaticGroupByMaterial(envGroup);

  /**
   * ==========================================================================
   * 6. HAUTEUR DE SOL VISITABLE (PARVIS, ESCALIER, NEF INTÉRIEURE & COLONNADE 51,5 m)
   * ==========================================================================
   */
  function getFloorHeightAt(wx, wz, currentY = 27.8) {
    const { lx, lz } = worldToPantheonLocal(wx, wz);

    // Galerie panoramique de la Colonnade du Dôme (ly = 51,5 m -> world y = 77,5 m)
    if (currentY > PANTHEON_WORLD_POS.y + 42 && Math.hypot(lx, lz) < 18.5) {
      return PANTHEON_WORLD_POS.y + BELVEDERE_Y;
    }

    // Intérieur du Panthéon & Portique (ly = 2,40 m)
    const inPorticoOrNave = lx >= -54.5 && lx <= 46.5 && Math.abs(lz) <= 18.5;
    const inTransept = Math.abs(lx) <= 16.5 && Math.abs(lz) <= 40.5;
    if (inPorticoOrNave || inTransept) {
      return PANTHEON_WORLD_POS.y + FLOOR_Y;
    }

    // Grand escalier monumental Ouest (x = -62.5 .. -54.5 -> pente douce 0 -> 2.40 m)
    if (lx >= -62.5 && lx < -54.5 && Math.abs(lz) <= 19.2) {
      const t = THREE.MathUtils.clamp((lx - -62.5) / 8.0, 0, 1);
      return PANTHEON_WORLD_POS.y + t * FLOOR_Y;
    }

    return PANTHEON_WORLD_POS.y + 0.06;
  }

  /**
   * ==========================================================================
   * 7. PROLOGUE 360° & 7 POINTS D'INTÉRÊT HISTORIQUES DU PANTHÉON
   * ==========================================================================
   */
  const introChapter = {
    id: 'pantheon-intro-360',
    title: 'Histoire du Panthéon — Tour 360°',
    era: '1758 – 1790 • Néoclassicisme (Soufflot)',
    location: 'Montagne Sainte-Geneviève • 5e arrondissement',
    history:
      "Voulu en 1744 par Louis XV pour remercier Sainte Geneviève de sa guérison, le Panthéon fut dessiné par Jacques-Germain Soufflot afin d'unir la légèreté des voûtes gothiques à la pureté des colonnades grecques. Transformé en temple républicain en 1791, il honore depuis plus de deux siècles les grandes figures de la Nation.",
    anecdote:
      "Son immense dôme de 83 mètres dissimule une prouesse d'ingénierie : trois coupoles de pierre emboîtées l'une dans l'autre, soutenant en 1851 le célèbre pendule de 67 mètres par lequel Léon Foucault prouva la rotation de la Terre !",
    voiceover:
      "Bienvenue au sommet de la Montagne Sainte-Geneviève, devant le Panthéon de Paris. " +
      "Commandé par Louis XV à l'architecte Jacques-Germain Soufflot, cet immense édifice néoclassique en croix grecque domine le Quartier Latin de son dôme à colonnade culminant à 83 mètres. " +
      "Devenu nécropole civique sous la Révolution française, son fronton porte la devise immortelle : Aux Grands Hommes, la Patrie reconnaissante. " +
      "De son péristyle corinthien à la triple coupole intérieure et au célèbre Pendule de Foucault, découvrons ensemble ses sept lieux majeurs.",
  };

  function makePoi(spec) {
    return {
      ...spec,
      markerPos: localToWorld(...spec.localMarker),
      cameraPos: localToWorld(...spec.localCam),
      target: localToWorld(...spec.localTarget),
      fpsPos: localToWorld(...spec.localFps),
    };
  }

  const pois = [
    makePoi({
      id: 'pantheon-portique-fronton',
      title: 'Le Péristyle Corinthien & le Fronton de David d’Angers',
      shortTitle: 'Portique & Fronton',
      era: '1758 – 1837 • Soufflot & David d’Angers',
      location: 'Façade Ouest • Axe Rue Soufflot',
      localMarker: [-54, 18, 0],
      localCam: [-102, 22, 28],
      localTarget: [-42, 18, 0],
      localFps: [-66, 1.85, 0],
      history:
        "Inspiré du Panthéon de Rome, le portique monumental déploie 22 colonnes corinthiennes cannelées de 19 mètres de haut supportant la célèbre frise dorée « Aux Grands Hommes la Patrie reconnaissante » et le fronton triangulaire sculpté par David d'Angers en 1837.",
      anecdote:
        "Au centre du fronton, la Patrie distribue des couronnes de laurier entre la Liberté et l'Histoire, entourée de Voltaire, Rousseau, Bonaparte, Cuvier, Monge et Bichat sculptés en haut-relief.",
    }),
    makePoi({
      id: 'pantheon-nef-foucault',
      title: 'La Grande Nef & le Pendule de Foucault',
      shortTitle: 'Pendule de Foucault',
      era: '1851 • Démonstration de la rotation terrestre',
      location: 'Intérieur • Croisée sous la Coupole',
      localMarker: [0, 8.5, 0],
      localCam: [-25, 9.8, 9.2],
      localTarget: [2, 5.2, -1],
      localFps: [-22, 4.15, 0],
      history:
        "Au cœur de la grande croix grecque bordée de colonnades corinthiennes libres et dallée de marbre polychrome oscille le célèbre Pendule de Foucault : une sphère de laiton de 28 kg suspendue à un câble de 67 mètres depuis le sommet de la coupole.",
      anecdote:
        "En mars 1851, Léon Foucault invita le public par ces mots célèbres : « Vous êtes invités à venir voir tourner la Terre ». En apparence, le plan d'oscillation dévie de 11° par heure — c'est en réalité Paris qui tourne sous le pendule !",
    }),
    makePoi({
      id: 'pantheon-triple-coupole',
      title: 'La Triple Coupole & l’Apothéose de Sainte-Geneviève',
      shortTitle: 'Triple Coupole',
      era: '1780 & 1824 • Soufflot & Antoine-Jean Gros',
      location: 'Intérieur • Oculus & Fresque céleste (66 m)',
      localMarker: [0, 42, 0],
      localCam: [-9.2, 14.0, 9.2],
      localTarget: [0, 50.0, 0],
      localFps: [-9.5, 4.15, 6.5],
      history:
        "En levant les yeux sous la croisée, on découvre le coup de génie de Soufflot : la première coupole à caissons est percée d'un immense oculus circulaire laissant apercevoir la seconde coupole peinte par Antoine-Jean Gros, baignée d'une lumière zénithale mystérieuse.",
      anecdote:
        "Cette construction en trois coques superposées permet d'allier une silhouette extérieure monumentale de 83 mètres à un espace intérieur lumineux, harmonieux et parfaitement équilibré.",
    }),
    makePoi({
      id: 'pantheon-convention-crypte',
      title: 'La Convention Nationale, les Fresques & la Crypte',
      shortTitle: 'Chœur, Fresques & Crypte',
      era: '1874 – 1924 • Puvis de Chavannes & Sicard',
      location: 'Intérieur • Chœur Est & Accès Crypte',
      localMarker: [35, 9.5, 0],
      localCam: [10, 8.2, 9.5],
      localTarget: [36, 7.8, 0],
      localFps: [18, 4.15, 0],
      history:
        "Le chœur oriental abrite l'imposant groupe en marbre blanc de La Convention Nationale (François-Léon Sicard, 1924) dominé par la mosaïque dorée d'Ernest Hébert, tandis que les murs de la nef racontent la vie de Sainte Geneviève peinte par Puvis de Chavannes.",
      anecdote:
        "Juste derrière le chœur s'ouvrent les escaliers de la Crypte où reposent plus de 80 grandes figures : Voltaire, Rousseau, Victor Hugo, Émile Zola, Marie et Pierre Curie, Jean Moulin, Simone Veil, Joséphine Baker et Missak Manouchian.",
    }),
    makePoi({
      id: 'pantheon-dome-colonnade',
      title: 'Le Dôme de 83 m & sa Colonnade Périptère',
      shortTitle: 'Dôme & 32 Colonnes',
      era: '1776 – 1790 • Rondelet & Coupole de plomb',
      location: 'Sommet du tambour • 83 mètres',
      localMarker: [0, 56, 0],
      localCam: [-58, 66, 52],
      localTarget: [0, 54, 0],
      localFps: [-15.8, 53.25, 0],
      history:
        "Inspiré par le Tempietto de Bramante et Saint-Paul de Londres, le tambour du Panthéon s'entoure d'une spectaculaire colonnade circulaire de 32 colonnes corinthiennes libres, surmontée d'une coupole de plomb patiné à 16 nervures et d'un lanterneau culminant à 83 mètres.",
      anecdote:
        "Lors de la grande restauration achevée récemment, la charpente de pierre et les plaques de plomb du dôme ont retrouvé leur éclat d'origine ainsi que le mécanisme historique du pendule.",
    }),
    makePoi({
      id: 'pantheon-belvedere-paris',
      title: 'La Colonnade Panoramique sur Paris',
      shortTitle: 'Belvédère du Dôme',
      era: '51,5 mètres • Perspective Rue Soufflot',
      location: 'Galerie supérieure du Tambour',
      localMarker: [-16, 53.5, 0],
      localCam: [-21, 56, 4.5],
      localTarget: [-260, 26, 0],
      localFps: [-15.9, 53.25, 0],
      history:
        "Depuis la galerie circulaire à 51,5 mètres au-dessus de la Montagne Sainte-Geneviève, la perspective rectiligne de la Rue Soufflot file droit vers le Jardin du Luxembourg, le dôme des Invalides, la Tour Montparnasse et la Tour Eiffel à l'horizon.",
      anecdote:
        "Grâce à l'altitude naturelle de la colline (61 m au-dessus de la mer), ce belvédère offre l'un des plus beaux panoramas à 360° sur la Rive Gauche, Notre-Dame et Montmartre.",
    }),
    makePoi({
      id: 'pantheon-place-quartier-latin',
      title: 'Place du Panthéon, Sainte-Geneviève & Saint-Étienne-du-Mont',
      shortTitle: 'Place & Quartier Latin',
      era: 'XIIe – XIXe s. • Cœur universitaire',
      location: 'Ensemble monumental de la Place',
      localMarker: [34, 18, -64],
      localCam: [-108, 64, -92],
      localTarget: [18, 22, -14],
      localFps: [-76, 1.85, -36],
      history:
        "Autour du Panthéon s'ordonne un écrin architectural unique : les deux façades courbes jumelles de Soufflot (Faculté de Droit et Mairie du 5e), la Bibliothèque Sainte-Geneviève d'Henri Labrouste (1850), l'église gothique-Renaissance Saint-Étienne-du-Mont et la Tour Clovis du Lycée Henri-IV.",
      anecdote:
        "La façade de la Bibliothèque Sainte-Geneviève est gravée des noms de 810 grands savants et écrivains de l'Antiquité au XIXe siècle, faisant face au temple des Grands Hommes !",
    }),
  ];

  /**
   * ==========================================================================
   * 8. LOD & BOUCLE D'ANIMATION : PENDULE DE FOUCAULT & ILLUMINATION NOCTURNE
   * ==========================================================================
   */
  let elapsed = 0;
  let currentLod = 0;

  function setLodLevel(level, camDist = 200) {
    currentLod = level;
    // Le Dôme (83 m) reste visible dans toute la skyline ; intérieur & quartier proche coupés à distance
    interiorGroup.visible = level === 0;
    pendulumPivot.visible = level === 0;
    envGroup.visible = camDist < 2400;
  }

  function update(dt, nightFactor = 0.1, glassGlow = 0.2, isFocused = false) {
    const clampedDt = Math.min(dt, 0.05);
    elapsed += clampedDt;

    // 1. Animation réaliste du Pendule de Foucault (oscillation douce + lente précession du plan)
    if (currentLod === 0) {
      const swingAngle = Math.sin(elapsed * 0.62) * 0.068; // ~4,2 m d'amplitude sur le cadran de 4,55 m !
      const precession = elapsed * 0.018;
      pendulumPivot.rotation.set(0, precession, swingAngle, 'YXZ');
    }

    // 2. Illumination nocturne des façades, portique, dôme, réverbères & fresque de la coupole
    const glow = Math.max(0, (nightFactor - 0.25) / 0.75);
    matWindowGlass.emissiveIntensity = 0.12 + Math.max(glassGlow, glow) * 0.85;
    matLampGlow.emissiveIntensity = 0.22 + glow * 1.65;
    matFrieze.emissiveIntensity = glow * 0.32;
    matApotheosis.emissiveIntensity = 0.30 + (1 - glow) * 0.18 + glow * 0.28;
    matApseMosaic.emissiveIntensity = 0.28 + glow * 0.25;

    const showLights = currentLod === 0 && (isFocused || glow > 0.12);
    interiorLights[0].visible = showLights;
    interiorLights[1].visible = showLights;
    if (showLights) {
      interiorLights[0].intensity = 28 + glow * 42;
      interiorLights[1].intensity = 22 + glow * 34;
    }

    const showFacadeLights = currentLod === 0 && glow > 0.05;
    facadeNightLights[0].visible = showFacadeLights;
    facadeNightLights[1].visible = showFacadeLights;
    if (showFacadeLights) {
      facadeNightLights[0].intensity = glow * 95;
      facadeNightLights[1].intensity = glow * 85;
    }
  }

  return {
    id: 'pantheon',
    name: 'Le Panthéon',
    root,
    colliders,
    circleColliders,
    worldBounds: {
      minX: PANTHEON_WORLD_POS.x - 165,
      maxX: PANTHEON_WORLD_POS.x + 155,
      minZ: PANTHEON_WORLD_POS.z - 135,
      maxZ: PANTHEON_WORLD_POS.z + 135,
    },
    fpsSpawnPos: localToWorld(-66, 1.85, 0),
    fpsSpawnTarget: localToWorld(-24, 12, 0),
    getFloorHeightAt,
    setLodLevel,
    introChapter,
    pois,
    update,
  };
}
