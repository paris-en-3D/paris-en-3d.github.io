import * as THREE from 'three';
import { mergeStaticGroupByMaterial } from '../perf-manager.js';
import { getParisElevation } from '../paris-data.js';
import { worldToChampsLocal } from './champs-elysees.js';

/**
 * ============================================================================
 * MONUMENT COMPLET #3 : L'ARC DE TRIOMPHE DE L'ÉTOILE (ÉCHELLE RÉELLE 1:1)
 * Position GPS : 48.8738° N, 2.2950° E -> (-3658, +18, -1156)
 * Dimensions exactes : 49,5 m de haut × 44,8 m de large × 22,2 m de profondeur
 * Orienté dans l'Axe Historique Champs-Élysées ↔ Grande-Armée.
 *
 * Contient :
 *  - 4 piliers monumentaux, Grande Voûte (14,62 m × 29,19 m) & Petite Voûte (8,44 m × 18,68 m)
 *  - Voûtes en berceau à caissons octogonaux sculptés & clés de voûte
 *  - 4 grands hauts-reliefs sculptés 3D (La Marseillaise, Triomphe de 1810, Résistance, Paix)
 *    + 6 bas-reliefs rectangulaires + Grande Frise d'entablement
 *  - Attique aux 30 boucliers de batailles & corniche saillante à modillons
 *  - Noms gravés des 660 généraux de l'Empire sous les voûtes
 *  - Tombe du Soldat Inconnu (1920) & Flamme Éternelle animée en temps réel
 *  - Terrasse panoramique visitable à 49,5 m avec 4 tables d'orientation en bronze
 *  - Place Charles-de-Gaulle à l'étoile bicolore, rond-point pavé & 12 Hôtels des Maréchaux
 *  - Prologue 360° & 7 Points d'Intérêt historiques
 * ============================================================================
 */

const ARC_WORLD_POS = new THREE.Vector3(-3658, 18, -1156);
// Axe +Z local pointe vers Place de la Concorde (-1741, -245) / Champs-Élysées
const AZ_CHAMPS_ELYSEES = Math.atan2(-245 - (-1156), -1741 - (-3658));
const ARC_ROT_Y = Math.PI * 0.5 - AZ_CHAMPS_ELYSEES;

function createChateauLandonStoneTexture() {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#e6dcc8';
  ctx.fillRect(0, 0, size, size);

  // Joints d'assises horizontaux en pierre de Château-Landon
  for (let y = 0; y < size; y += 24) {
    const shade = ((y * 7) % 13) - 6;
    ctx.fillStyle = `rgba(${225 + shade}, ${214 + shade}, ${194 + shade}, 0.45)`;
    ctx.fillRect(0, y, size, 23);
    ctx.fillStyle = 'rgba(118, 106, 86, 0.28)';
    ctx.fillRect(0, y + 23, size, 1.5);
  }

  // Appareillage vertical en quinconce
  ctx.strokeStyle = 'rgba(120, 108, 88, 0.18)';
  ctx.lineWidth = 1.2;
  for (let row = 0; row < 22; row++) {
    const y0 = row * 24;
    const off = (row % 2) * 32;
    for (let x = off; x < size; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y0 + 24);
      ctx.stroke();
    }
  }

  for (let i = 0; i < 4200; i++) {
    const x = (i * 179) % size;
    const y = (i * 293) % size;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,250,240,0.08)' : 'rgba(92,82,66,0.07)';
    ctx.fillRect(x, y, 2, 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 4);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createHighReliefTexture(variant = 'marseillaise') {
  const w = 512;
  const h = 768;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  // Fond de stèle sculptée en pierre calcaire blonde & niche ombrée
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#cfc2aa');
  bg.addColorStop(0.45, '#e8dec9');
  bg.addColorStop(1, '#c4b59a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#97886d';
  ctx.lineWidth = 14;
  ctx.strokeRect(12, 12, w - 24, h - 24);
  ctx.strokeStyle = '#f2ead8';
  ctx.lineWidth = 4;
  ctx.strokeRect(24, 24, w - 48, h - 48);

  if (variant === 'marseillaise') {
    // Génie ailé de la Liberté (haut) déployant ses grandes plumes sur les volontaires
    ctx.fillStyle = '#baa98c';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.25, 195, 120, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    for (let feather = -7; feather <= 7; feather++) {
      ctx.save();
      ctx.translate(w * 0.5, h * 0.27);
      ctx.rotate(feather * 0.16);
      ctx.fillStyle = feather % 2 === 0 ? '#f4ede0' : '#dfd2b8';
      ctx.fillRect(-11, -172, 20, 152);
      ctx.restore();
    }
  } else if (variant === 'triomphe') {
    // Cortot : Napoléon Ier couronné par la Victoire ailée & palmes triomphales
    ctx.fillStyle = '#c5b79c';
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.29, 130, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d4b25c';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.31, 68, 0.2, Math.PI * 1.8);
    ctx.stroke();
  } else if (variant === 'resistance') {
    // Étex : Guerrier brandissant le glaive protégeant famille et drapeau
    ctx.fillStyle = '#c4b69b';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.28, 135, 105, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#dfd3bb';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(w * 0.22, h * 0.42);
    ctx.lineTo(w * 0.78, h * 0.16);
    ctx.stroke();
  } else {
    // La Paix (Étex) : Minerve apaisée, rameau d'olivier & abondance
    ctx.fillStyle = '#cfc2a8';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.3, 145, 95, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#efe7d6';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.32, 94, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  }

  // Groupes héroïques en haut-relief & draperies profondes
  const figs = [
    [0.2, 0.64, 44, 195],
    [0.39, 0.56, 52, 230],
    [0.6, 0.58, 48, 220],
    [0.8, 0.66, 42, 185],
  ];
  figs.forEach(([fx, fy, fw, fh], i) => {
    const cx = w * fx;
    const cy = h * fy;
    ctx.fillStyle = 'rgba(68, 58, 44, 0.38)';
    ctx.beginPath();
    ctx.ellipse(cx + 12, cy + 12, fw * 0.82, fh * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();

    const fg = ctx.createLinearGradient(cx - fw, cy, cx + fw, cy);
    fg.addColorStop(0, '#f4ede0');
    fg.addColorStop(0.55, '#ddd0b7');
    fg.addColorStop(1, '#a99a7e');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.ellipse(cx, cy, fw * 0.76, fh * 0.5, (i - 1.5) * 0.08, 0, Math.PI * 2);
    ctx.fill();

    // Tête / casque sculpté + bouclier
    ctx.fillStyle = '#f6f0e4';
    ctx.beginPath();
    ctx.arc(cx, cy - fh * 0.53, 21, 0, Math.PI * 2);
    ctx.fill();
    if (i % 2 === 1) {
      ctx.strokeStyle = '#b49e72';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(cx - fw * 0.25, cy - fh * 0.1, 24, 0, Math.PI * 2);
      ctx.stroke();
    }
  });

  // Lances, glaives et étendards verticaux
  ctx.strokeStyle = '#f2ead8';
  ctx.lineWidth = 5;
  [-95, -24, 42, 108].forEach((ox, idx) => {
    ctx.beginPath();
    ctx.moveTo(w * 0.5 + ox, h * 0.88);
    ctx.lineTo(w * 0.5 + ox + (idx - 1.5) * 22, h * 0.14);
    ctx.stroke();
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createNarrativeBasReliefTexture() {
  const w = 512;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#d7cab0';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#9b8d72';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, w - 16, h - 16);

  // Bas-relief de bataille épique (cavaliers, drapeaux, fantassins en clair-obscur)
  for (let i = 0; i < 14; i++) {
    const x = 36 + i * 33;
    const isRider = i === 3 || i === 9;
    const top = isRider ? 64 : 104 + ((i * 7) % 18);
    ctx.fillStyle = 'rgba(72, 62, 46, 0.36)';
    ctx.fillRect(x + 4, top + 4, isRider ? 26 : 16, 224 - top);
    ctx.fillStyle = i % 2 === 0 ? '#efe7d5' : '#e2d6be';
    ctx.fillRect(x, top, isRider ? 24 : 15, 220 - top);
    ctx.beginPath();
    ctx.arc(x + (isRider ? 12 : 7), top - 10, 9, 0, Math.PI * 2);
    ctx.fill();
    if (i % 3 === 1) {
      ctx.strokeStyle = '#f2ebdc';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 6, 210);
      ctx.lineTo(x + 26, 28);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createCofferVaultTexture() {
  const size = 1024;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#e0d5be';
  ctx.fillRect(0, 0, size, size);

  const cells = 4;
  const step = size / cells;
  for (let r = 0; r < cells; r++) {
    for (let col = 0; col < cells; col++) {
      const x = col * step;
      const y = r * step;
      const cx = x + step * 0.5;
      const cy = y + step * 0.5;

      // Caisson mouluré octogonal profond à 4 gradins d'ombre
      ctx.strokeStyle = '#eee4cf';
      ctx.lineWidth = 8;
      ctx.strokeRect(x + 10, y + 10, step - 20, step - 20);
      ctx.fillStyle = '#baa98d';
      ctx.fillRect(x + 18, y + 18, step - 36, step - 36);
      ctx.fillStyle = '#97876c';
      ctx.fillRect(x + 36, y + 36, step - 72, step - 72);
      ctx.fillStyle = '#7c6e56';
      ctx.fillRect(x + 54, y + 54, step - 108, step - 108);

      // Rosace sculptée centrale dorée/ivoire à double couronne de pétales
      ctx.fillStyle = '#f3ead7';
      ctx.beginPath();
      for (let p = 0; p < 12; p++) {
        const a = (p / 12) * Math.PI * 2;
        const px = cx + Math.cos(a) * 34;
        const py = cy + Math.sin(a) * 34;
        ctx.moveTo(px + 14, py);
        ctx.arc(px, py, 14, 0, Math.PI * 2);
      }
      ctx.fill();

      ctx.fillStyle = '#d5ad54';
      ctx.beginPath();
      ctx.arc(cx, cy, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#7c622e';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 5);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createGeneralsEngravingTexture() {
  const w = 1024;
  const h = 1536;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#dfd3bc';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#9c8f76';
  ctx.lineWidth = 10;
  ctx.strokeRect(22, 22, w - 44, h - 44);
  ctx.strokeStyle = '#efe6d5';
  ctx.lineWidth = 4;
  ctx.strokeRect(36, 36, w - 72, h - 72);

  // Cartouche supérieur des grandes victoires avec couronne de laurier
  ctx.fillStyle = '#cfc1a7';
  ctx.fillRect(58, 54, w - 116, 200);
  ctx.strokeStyle = '#b4944e';
  ctx.lineWidth = 5;
  ctx.strokeRect(70, 66, w - 140, 176);
  ctx.fillStyle = '#3f3628';
  ctx.font = 'bold 34px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('ARMÉES DU NORD • DE L’EST', w * 0.5, 118);
  ctx.fillStyle = '#473e30';
  ctx.font = 'bold 40px Georgia, serif';
  ctx.fillText('AUSTERLITZ • IÉNA • MARENGO', w * 0.5, 172);
  ctx.fillText('FRIEDLAND • WAGRAM • RIVOLI', w * 0.5, 222);

  // Colonnes de noms des généraux & maréchaux gravés dans la pierre
  const names = [
    ['KELLERMANN', false], ['LEFEBVRE', false], ['JOURDAN', false], ['MASSÉNA', false],
    ['AUGEREAU', false], ['BERTHIER', false], ['MURAT', false], ['LANNES', true],
    ['BESSIÈRES', true], ['DAVOUT', false], ['SOULT', false], ['NEY', false],
    ['MORTIER', false], ['SUCHET', false], ['HOCHE', true], ['KLÉBER', true],
    ['DESAIX', true], ['MARCEAU', true], ['MORAND', false], ['LASALLE', true],
    ['OUDINOT', false], ['MACDONALD', false], ['MARMONT', false], ['GROUCHY', false],
    ['DUMOURIEZ', false], ['CUSTINE', false], ['BEURNONVILLE', false], ['DUROC', true],
    ['CAULAINCOURT', true], ['JUNOT', false], ['RAPP', false], ['DROUOT', false],
  ];

  ctx.font = 'bold 28px Georgia, serif';
  ctx.textAlign = 'left';
  for (let col = 0; col < 2; col++) {
    const xBase = col === 0 ? 78 : 534;
    for (let row = 0; row < 29; row++) {
      const [name, fallen] = names[(row + col * 11) % names.length];
      const y = 324 + row * 40;
      ctx.fillStyle = '#473d30';
      ctx.fillText(name, xBase, y);
      if (fallen) {
        // Les généraux morts au combat sont soulignés sur l'Arc de Triomphe
        ctx.fillStyle = '#6b5b44';
        ctx.fillRect(xBase, y + 6, ctx.measureText(name).width, 3);
      }
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createGrandFriezeTexture() {
  const w = 2048;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#d4c6ac';
  ctx.fillRect(0, 0, w, h);

  // Moulures haut & bas de la Grande Frise
  ctx.fillStyle = '#b1a184';
  ctx.fillRect(0, 0, w, 18);
  ctx.fillRect(0, h - 18, w, 18);
  ctx.fillStyle = '#ece3d0';
  ctx.fillRect(0, 18, w, 5);
  ctx.fillRect(0, h - 23, w, 5);

  // Frise continue de 68 silhouettes de soldats, cavaliers et allégories en bas-relief
  for (let i = 0; i < 68; i++) {
    const x = i * 30 + 14;
    const isCavalry = i % 7 === 0;
    const stride = i % 3 === 0 ? 8 : 0;
    ctx.fillStyle = 'rgba(78, 67, 51, 0.36)';
    ctx.fillRect(x + 5, isCavalry ? 74 : 62, isCavalry ? 26 : 16, isCavalry ? 156 : 168);
    ctx.fillStyle = '#efe7d6';
    ctx.fillRect(x, isCavalry ? 70 : 58, isCavalry ? 24 : 15, isCavalry ? 156 : 168);
    ctx.beginPath();
    ctx.arc(x + (isCavalry ? 14 : 7.5), (isCavalry ? 52 : 46) - stride * 0.35, 9, 0, Math.PI * 2);
    ctx.fill();
    if (i % 4 === 0) {
      ctx.strokeStyle = '#efe7d6';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x + 12, 215);
      ctx.lineTo(x + 32, 24);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createPalmetteImpostTexture() {
  const w = 512;
  const h = 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#dfd4be';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#b4a58a';
  ctx.fillRect(0, 0, w, 18);
  ctx.fillRect(0, h - 18, w, 18);

  for (let x = 24; x < w; x += 48) {
    ctx.fillStyle = '#f3ebda';
    ctx.beginPath();
    ctx.ellipse(x, h * 0.52, 16, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#9f9075';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#efe6d4';
    ctx.beginPath();
    ctx.arc(x + 24, h * 0.52, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(4, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createBattleShieldTexture() {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  const cx = size * 0.5;
  const cy = size * 0.5;

  ctx.fillStyle = '#dfd4bd';
  ctx.fillRect(0, 0, size, size);

  // Couronne de chêne & laurier gravée autour du bouclier
  ctx.strokeStyle = '#9f9074';
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.arc(cx, cy, 224, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#efe7d6';
  ctx.beginPath();
  ctx.arc(cx, cy, 206, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#b8964e';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(cx, cy, 184, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#534737';
  ctx.font = 'bold 42px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('VICTOIRE', cx, cy - 28);
  ctx.fillText('EMPIRE', cx, cy + 56);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createSacredSlabTexture() {
  const w = 512;
  const h = 768;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#3d3936';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#c89b3c';
  ctx.lineWidth = 14;
  ctx.strokeRect(24, 24, w - 48, h - 48);
  ctx.strokeStyle = '#756b60';
  ctx.lineWidth = 4;
  ctx.strokeRect(42, 42, w - 84, h - 84);

  ctx.fillStyle = '#e8c978';
  ctx.font = 'bold 34px Georgia, serif';
  ctx.textAlign = 'center';
  const lines = ['ICI REPOSE', 'UN SOLDAT', 'FRANÇAIS', 'MORT POUR', 'LA PATRIE', '1914 – 1918'];
  lines.forEach((txt, i) => {
    ctx.fillText(txt, w * 0.5, 210 + i * 74);
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createEtoileStarPavementTexture() {
  const size = 1024;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  const cx = size * 0.5;
  const cy = size * 0.5;

  // Esplanade centrale en granit clair bleuté/rose
  ctx.fillStyle = '#c9c1b2';
  ctx.fillRect(0, 0, size, size);

  // Anneaux concentriques de pavés
  [480, 440, 320, 210].forEach((rad, idx) => {
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fillStyle = idx % 2 === 0 ? '#bdb5a7' : '#d2cab9';
    ctx.fill();
  });

  // L'étoile célèbre à 12 branches en granit sombre/bordeaux rayonnant sous l'Arc
  ctx.fillStyle = '#6c5a55';
  ctx.beginPath();
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const r = i % 2 === 0 ? 465 : 195;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  // Contre-étoile dorée claire au cœur du parvis
  ctx.fillStyle = '#cfc5b4';
  ctx.beginPath();
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const r = i % 2 === 0 ? 345 : 140;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  // Bordure périphérique en granit clair
  ctx.strokeStyle = '#dfd8ca';
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.arc(cx, cy, 496, 0, Math.PI * 2);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createCobbleRoundaboutTexture() {
  const w = 256;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#47494f';
  ctx.fillRect(0, 0, w, h);

  // Rangées de pavés parisiens concentriques
  for (let y = 0; y < h; y += 16) {
    const off = ((y / 16) % 2) * 10;
    for (let x = -20; x < w; x += 20) {
      const shade = 64 + ((x * 3 + y * 5) % 20);
      ctx.fillStyle = `rgb(${shade}, ${shade + 1}, ${shade + 4})`;
      ctx.fillRect(x + off + 1, y + 1, 18, 14);
    }
  }

  // Lignes blanches discrètes de séparation des voies circulaires
  ctx.fillStyle = 'rgba(236, 232, 222, 0.42)';
  for (let x = 8; x < w; x += 48) {
    ctx.fillRect(x, 82, 24, 4);
    ctx.fillRect(x, 170, 24, 4);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createMarechauxFacadeTexture({ emissiveOnly = false } = {}) {
  const w = 512;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  if (emissiveOnly) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);
    for (let col = 0; col < 5; col++) {
      const ax = 24 + col * 98;
      if (col % 2 === 0) {
        ctx.fillStyle = '#ffb85c';
        ctx.fillRect(ax + 6, h - 84, 44, 74);
      }
    }
    [276, 176, 78].forEach((fy, rIdx) => {
      for (let col = 0; col < 6; col++) {
        if ((col + rIdx) % 3 === 1) continue;
        const fx = 22 + col * 82;
        ctx.fillStyle = (col + rIdx) % 2 === 0 ? '#ffd080' : '#ffab4c';
        ctx.fillRect(fx + 2, fy + 2, 32, 58);
      }
    });
  } else {
    // Hôtels des Maréchaux (Hittorff 1854) : façade blonde symétrique à arcades
    ctx.fillStyle = '#e4d9c4';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(95, 84, 68, 0.14)';
    for (let y = 0; y < h; y += 22) {
      ctx.fillRect(0, y, w, 1.5);
    }

    ctx.fillStyle = '#d3c6af';
    ctx.fillRect(0, h - 120, w, 120);
    for (let col = 0; col < 5; col++) {
      const ax = 24 + col * 98;
      ctx.fillStyle = '#2a333d';
      ctx.fillRect(ax, h - 90, 56, 86);
      ctx.beginPath();
      ctx.arc(ax + 28, h - 90, 28, Math.PI, Math.PI * 2);
      ctx.fill();
    }

    [276, 176, 78].forEach((fy, rIdx) => {
      ctx.fillStyle = '#cdc0a7';
      ctx.fillRect(0, fy + 76, w, 7);
      for (let col = 0; col < 6; col++) {
        const fx = 22 + col * 82;
        ctx.fillStyle = '#f1eadb';
        ctx.fillRect(fx - 4, fy - 4, 44, 72);
        ctx.fillStyle = '#283644';
        ctx.fillRect(fx, fy, 36, 64);
        ctx.fillStyle = '#e6dfd1';
        ctx.fillRect(fx + 17, fy, 2, 64);
        ctx.fillRect(fx, fy + 26, 36, 2);
        if (rIdx === 0 || rIdx === 2) {
          ctx.fillStyle = '#25282c';
          ctx.fillRect(0, fy + 58, w, 7);
        }
      }
    });
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function buildArcDeTriompheMonument(scene) {
  const root = new THREE.Group();
  root.name = 'ArcDeTriompheMonument';
  root.position.copy(ARC_WORLD_POS);
  root.rotation.y = ARC_ROT_Y;
  scene.add(root);
  root.updateMatrixWorld(true);

  const archGroup = new THREE.Group();
  archGroup.name = 'ArcDeTriompheArchitecture';
  root.add(archGroup);

  const envGroup = new THREE.Group();
  envGroup.name = 'PlaceCharlesDeGaulleEnv';
  root.add(envGroup);

  const flameGroup = new THREE.Group();
  flameGroup.name = 'FlammeSoldatInconnu';
  flameGroup.userData.noMerge = true;
  root.add(flameGroup);

  const colliders = [];
  const circleColliders = [];

  function localToWorld(lx, ly, lz) {
    return new THREE.Vector3(lx, ly, lz).applyMatrix4(root.matrixWorld);
  }

  function addLocalCircleCollider(lx, lz, r) {
    const w = localToWorld(lx, 0, lz);
    circleColliders.push({ x: w.x, z: w.z, r });
  }

  // --- MATÉRIAUX ---
  const matStone = new THREE.MeshStandardMaterial({
    map: createChateauLandonStoneTexture(),
    roughness: 0.8,
    metalness: 0.03,
    emissive: new THREE.Color(0x000000),
  });
  const matStoneLight = new THREE.MeshStandardMaterial({
    color: 0xeee4d2,
    roughness: 0.76,
    metalness: 0.04,
    emissive: new THREE.Color(0x000000),
  });
  const matGranitePlinth = new THREE.MeshStandardMaterial({
    color: 0xa79e92,
    roughness: 0.85,
  });
  const matVaultCoffer = new THREE.MeshStandardMaterial({
    map: createCofferVaultTexture(),
    roughness: 0.72,
    emissive: new THREE.Color(0x000000),
  });
  const matEngraving = new THREE.MeshStandardMaterial({
    map: createGeneralsEngravingTexture(),
    roughness: 0.78,
  });
  const matFrieze = new THREE.MeshStandardMaterial({
    map: createGrandFriezeTexture(),
    roughness: 0.76,
    emissive: new THREE.Color(0x000000),
  });
  const matBasRelief = new THREE.MeshStandardMaterial({
    map: createNarrativeBasReliefTexture(),
    roughness: 0.76,
    emissive: new THREE.Color(0x000000),
  });
  const matImpost = new THREE.MeshStandardMaterial({
    map: createPalmetteImpostTexture(),
    roughness: 0.74,
    emissive: new THREE.Color(0x000000),
  });
  const matShield = new THREE.MeshStandardMaterial({
    map: createBattleShieldTexture(),
    roughness: 0.72,
    emissive: new THREE.Color(0x000000),
  });
  const matSacredSlab = new THREE.MeshStandardMaterial({
    map: createSacredSlabTexture(),
    roughness: 0.42,
    metalness: 0.14,
  });
  const matReliefs = {
    marseillaise: new THREE.MeshStandardMaterial({ map: createHighReliefTexture('marseillaise'), roughness: 0.75, emissive: new THREE.Color(0x000000) }),
    triomphe: new THREE.MeshStandardMaterial({ map: createHighReliefTexture('triomphe'), roughness: 0.75, emissive: new THREE.Color(0x000000) }),
    resistance: new THREE.MeshStandardMaterial({ map: createHighReliefTexture('resistance'), roughness: 0.75, emissive: new THREE.Color(0x000000) }),
    paix: new THREE.MeshStandardMaterial({ map: createHighReliefTexture('paix'), roughness: 0.75, emissive: new THREE.Color(0x000000) }),
  };
  const nightLitStoneMats = [matStone, matStoneLight, matVaultCoffer, matFrieze, matBasRelief, matImpost, matShield, ...Object.values(matReliefs)];

  const matBronzeDark = new THREE.MeshStandardMaterial({ color: 0x26282b, roughness: 0.48, metalness: 0.72 });
  const matGold = new THREE.MeshStandardMaterial({ color: 0xd9ad4e, roughness: 0.3, metalness: 0.82 });
  const matTombGranite = new THREE.MeshStandardMaterial({ color: 0x3f3c3a, roughness: 0.55, metalness: 0.1 });
  const matStarPavement = new THREE.MeshStandardMaterial({ map: createEtoileStarPavementTexture(), roughness: 0.84 });
  const matRoundaboutCobble = new THREE.MeshStandardMaterial({
    map: createCobbleRoundaboutTexture(),
    roughness: 0.88,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -6,
  });
  const matSidewalkStone = new THREE.MeshStandardMaterial({ color: 0xd6cebe, roughness: 0.86 });
  const texMarechauxEmissive = createMarechauxFacadeTexture({ emissiveOnly: true });
  const matMarechaux = new THREE.MeshStandardMaterial({
    map: createMarechauxFacadeTexture({ emissiveOnly: false }),
    emissiveMap: texMarechauxEmissive,
    emissive: new THREE.Color(0xffc978),
    emissiveIntensity: 0.05,
    roughness: 0.82,
  });
  const matSlateRoof = new THREE.MeshStandardMaterial({ color: 0x3b4654, roughness: 0.54, metalness: 0.22 });
  const matPresbourgAsphalt = new THREE.MeshStandardMaterial({ color: 0x3a3e46, roughness: 0.9 });
  const matGardenLawn = new THREE.MeshStandardMaterial({ color: 0x4b7439, roughness: 0.92 });
  const matIronRail = new THREE.MeshStandardMaterial({ color: 0x202428, roughness: 0.44, metalness: 0.62 });
  const matLampPost = new THREE.MeshStandardMaterial({ color: 0x222726, roughness: 0.5, metalness: 0.5 });
  const matLampGlow = new THREE.MeshStandardMaterial({
    color: 0xfff5d6,
    emissive: new THREE.Color(0xffbd58),
    emissiveIntensity: 0.25,
    roughness: 0.2,
  });

  function addBox(w, h, d, x, y, z, mat, { cast = true, receive = true, parent = archGroup } = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = cast;
    m.receiveShadow = receive;
    parent.add(m);
    return m;
  }

  function addCylinder(rt, rb, h, seg, x, y, z, mat, { cast = true, receive = true, parent = archGroup } = {}) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
    m.position.set(x, y, z);
    m.castShadow = cast;
    m.receiveShadow = receive;
    parent.add(m);
    return m;
  }

  /**
   * ==========================================================================
   * 1. STRUCTURE 1:1 DE L'ARC DE TRIOMPHE (44,8 m × 22,2 m × 49,5 m)
   *    Grande Voûte (demi-largeur 7,31 m, clé 29,19 m)
   *    Petite Voûte (demi-largeur 4,22 m, clé 18,68 m)
   * ==========================================================================
   */
  const G_HALF = 7.31;
  const G_SPRING = 21.88;
  const P_HALF = 4.22;
  const P_SPRING = 14.46;
  const ENTABL_Y = 35.80;

  // A. 4 Grands Piliers d'angle (|lx| ∈ [7.31, 22.40], |lz| ∈ [4.22, 11.10]) + Socles granit + Impostes à palmettes
  [-1, 1].forEach((sx) => {
    [-1, 1].forEach((sz) => {
      const px = sx * 14.855;
      const pz = sz * 7.66;
      addBox(15.09, ENTABL_Y, 6.88, px, ENTABL_Y * 0.5, pz, matStone);
      // Socle mouluré en granit à double degré & refends d'angle
      addBox(15.85, 1.35, 7.65, px, 0.68, pz, matGranitePlinth);
      addBox(15.55, 1.3, 7.35, px, 1.98, pz, matGranitePlinth);
      addBox(15.65, 0.55, 7.45, px, 2.85, pz, matStoneLight, { cast: false });
      // Bandeau d'imposte sculpté à palmettes de la Petite Voûte (y = 14,46 m)
      addBox(15.62, 0.92, 7.42, px, P_SPRING, pz, matImpost);
      addBox(15.76, 0.34, 7.56, px, P_SPRING + 0.56, pz, matStoneLight, { cast: false });

      // Pilastres d'angle cannelés sur les arêtes extérieures
      addBox(0.95, ENTABL_Y - 3.2, 0.95, sx * 22.42, (ENTABL_Y + 3.0) * 0.5, sz * 11.12, matStoneLight, { cast: false });

      // Colliders piétons à l'intérieur du pilier
      [-4.4, 0, 4.4].forEach((ox) => {
        [-1.3, 1.3].forEach((oz) => {
          addLocalCircleCollider(px + ox, pz + oz, 2.65);
        });
      });
    });

    // Massif plein au-dessus de la Petite Voûte (y = 18.68 .. 35.80) + imposte à palmettes Grande Voûte (y = 21.88)
    const pPeak = P_SPRING + P_HALF; // 18.68
    addBox(15.09, ENTABL_Y - pPeak, P_HALF * 2, sx * 14.855, (ENTABL_Y + pPeak) * 0.5, 0, matStone);
    addBox(15.72, 1.12, 22.84, sx * 14.855, G_SPRING, 0, matImpost);
    addBox(15.88, 0.4, 23.0, sx * 14.855, G_SPRING + 0.68, 0, matStoneLight, { cast: false });

    // Écoinçons extrudés de la Petite Voûte
    const pSpandrelShape = new THREE.Shape();
    pSpandrelShape.moveTo(-P_HALF, pPeak + 0.06);
    pSpandrelShape.lineTo(P_HALF, pPeak + 0.06);
    pSpandrelShape.lineTo(P_HALF, P_SPRING);
    pSpandrelShape.absarc(0, P_SPRING, P_HALF, 0, Math.PI, false);
    pSpandrelShape.lineTo(-P_HALF, pPeak + 0.06);

    const pSpandrelGeo = new THREE.ExtrudeGeometry(pSpandrelShape, {
      depth: 15.09,
      bevelEnabled: false,
      curveSegments: 20,
    });
    pSpandrelGeo.rotateY(Math.PI * 0.5);
    pSpandrelGeo.translate(sx > 0 ? G_HALF : -22.4, 0, 0);
    const pSpandrelMesh = new THREE.Mesh(pSpandrelGeo, matStone);
    pSpandrelMesh.castShadow = true;
    pSpandrelMesh.receiveShadow = true;
    archGroup.add(pSpandrelMesh);

    // Intrados caissonné de la Petite Voûte + doubleaux moulurés aux têtes
    const pSegs = 12;
    for (let k = 0; k < pSegs; k++) {
      const aMid = ((k + 0.5) / pSegs) * Math.PI;
      const segArcW = (Math.PI * P_HALF) / pSegs + 0.06;
      const vy = P_SPRING + Math.sin(aMid) * (P_HALF - 0.06);
      const vz = Math.cos(aMid) * (P_HALF - 0.06);
      const vMesh = addBox(15.0, 0.2, segArcW, sx * 14.855, vy, vz, matVaultCoffer, { cast: false });
      vMesh.rotation.x = Math.PI * 0.5 - aMid;
    }

    // Archivolte double, clé sculptée & médaillons latéraux Petite Voûte
    const sideArch = new THREE.Mesh(new THREE.TorusGeometry(P_HALF + 0.28, 0.34, 8, 22, Math.PI), matStoneLight);
    sideArch.rotation.y = Math.PI * 0.5;
    sideArch.position.set(sx * 22.42, P_SPRING, 0);
    const sideArchInner = new THREE.Mesh(new THREE.TorusGeometry(P_HALF - 0.02, 0.16, 6, 22, Math.PI), matStoneLight);
    sideArchInner.rotation.y = Math.PI * 0.5;
    sideArchInner.position.set(sx * 22.42, P_SPRING, 0);
    archGroup.add(sideArch, sideArchInner);
    addBox(1.05, 1.55, 1.25, sx * 22.6, pPeak + 0.3, 0, matStoneLight);
    [-4.6, 4.6].forEach((mz) => {
      const med = addCylinder(1.05, 1.05, 0.32, 16, sx * 22.52, pPeak + 1.15, mz, matStoneLight, { cast: false });
      med.rotation.z = Math.PI * 0.5;
    });
  });

  // B. Grande Voûte centrale (lx ∈ [-7.31, +7.31], lz ∈ [-11.10, +11.10], y = 21.88 .. 35.80)
  const gPeak = G_SPRING + G_HALF; // 29.19
  const gSpandrelShape = new THREE.Shape();
  gSpandrelShape.moveTo(-G_HALF, ENTABL_Y);
  gSpandrelShape.lineTo(G_HALF, ENTABL_Y);
  gSpandrelShape.lineTo(G_HALF, G_SPRING);
  gSpandrelShape.absarc(0, G_SPRING, G_HALF, 0, Math.PI, false);
  gSpandrelShape.lineTo(-G_HALF, ENTABL_Y);

  const gSpandrelGeo = new THREE.ExtrudeGeometry(gSpandrelShape, {
    depth: 22.2,
    bevelEnabled: false,
    curveSegments: 26,
  });
  gSpandrelGeo.translate(0, 0, -11.1);
  const gSpandrelMesh = new THREE.Mesh(gSpandrelGeo, matStone);
  gSpandrelMesh.castShadow = true;
  gSpandrelMesh.receiveShadow = true;
  archGroup.add(gSpandrelMesh);

  // Intrados caissonné de la Grande Voûte (16 voussoirs) + arcs doubleaux d'entrée
  const gSegs = 16;
  for (let k = 0; k < gSegs; k++) {
    const aMid = ((k + 0.5) / gSegs) * Math.PI;
    const segArcW = (Math.PI * G_HALF) / gSegs + 0.08;
    const vx = Math.cos(aMid) * (G_HALF - 0.08);
    const vy = G_SPRING + Math.sin(aMid) * (G_HALF - 0.08);
    const vMesh = addBox(segArcW, 0.22, 22.1, vx, vy, 0, matVaultCoffer, { cast: false });
    vMesh.rotation.z = aMid - Math.PI * 0.5;
  }
  [-4.4, 4.4].forEach((dz) => {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(G_HALF - 0.06, 0.22, 6, 28, Math.PI), matStoneLight);
    rib.position.set(0, G_SPRING, dz);
    archGroup.add(rib);
  });

  // Archivoltes doubles, clés sculptées & Renommées ailées de Pradier dans les écoinçons (+Z / -Z)
  [-11.14, 11.14].forEach((fz) => {
    const nSign = Math.sign(fz);
    const grandArch = new THREE.Mesh(new THREE.TorusGeometry(G_HALF + 0.42, 0.46, 8, 28, Math.PI), matStoneLight);
    grandArch.position.set(0, G_SPRING, fz);
    const innerArch = new THREE.Mesh(new THREE.TorusGeometry(G_HALF + 0.02, 0.22, 6, 28, Math.PI), matStoneLight);
    innerArch.position.set(0, G_SPRING, fz);
    archGroup.add(grandArch, innerArch);

    // Clé de voûte à console & buste casqué
    addBox(1.55, 2.45, 0.95, 0, gPeak + 0.48, fz + nSign * 0.34, matStoneLight);
    const keyBust = new THREE.Mesh(new THREE.SphereGeometry(0.54, 10, 8), matStoneLight);
    keyBust.position.set(0, gPeak + 0.65, fz + nSign * 0.85);
    archGroup.add(keyBust);

    // 4 Renommées ailées sculptées de Pradier (courbe élégante + aile déployée + trompette & couronne dorées)
    [-1, 1].forEach((sideX) => {
      const rx = sideX * 5.35;
      const ry = gPeak + 1.15;
      const rz = fz + nSign * 0.32;
      const body = addCylinder(0.42, 0.62, 3.2, 8, rx, ry, rz, matStoneLight);
      body.rotation.z = sideX * 0.72;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 8, 6), matStoneLight);
      head.position.set(rx - sideX * 1.15, ry + 0.95, rz + nSign * 0.15);
      archGroup.add(head);
      const wing = addBox(2.5, 0.68, 0.28, rx + sideX * 0.75, ry + 1.3, rz, matStoneLight);
      wing.rotation.z = sideX * -0.42;
      const trumpet = addCylinder(0.06, 0.2, 2.1, 8, rx - sideX * 2.1, ry + 0.72, rz + nSign * 0.28, matGold, { cast: false });
      trumpet.rotation.z = sideX * 1.15;
    });
  });

  // C. Panneaux gravés des 660 Généraux encadrés de pilastres & couronnes de victoire dorées
  [-1, 1].forEach((sx) => {
    [-7.66, 7.66].forEach((pz) => {
      addBox(0.24, 18.2, 6.85, sx * (G_HALF - 0.08), 12.2, pz, matStoneLight, { cast: false });
      addBox(0.16, 17.5, 6.35, sx * (G_HALF - 0.02), 12.2, pz, matEngraving, { cast: false });
      addBox(0.26, 0.65, 2.8, sx * (G_HALF - 0.02), 20.65, pz, matGold, { cast: false });
    });
  });
  [-1, 1].forEach((sz) => {
    [-14.855, 14.855].forEach((px) => {
      addBox(14.6, 11.1, 0.22, px, 8.6, sz * (P_HALF - 0.08), matStoneLight, { cast: false });
      addBox(14.1, 10.5, 0.15, px, 8.6, sz * (P_HALF - 0.01), matEngraving, { cast: false });
    });
  });

  // D. Les 4 Grands Hauts-Reliefs sculptés en 3D (y = 3,2 .. 15,8 m) + 6 Bas-Reliefs narratifs encadrés
  const reliefPlacements = [
    { px: +14.855, pz: +11.12, zSign: 1, key: 'marseillaise' }, // Pilier droit Champs-Élysées
    { px: -14.855, pz: +11.12, zSign: 1, key: 'triomphe' },     // Pilier gauche Champs-Élysées
    { px: -14.855, pz: -11.12, zSign: -1, key: 'resistance' },  // Pilier droit Grande-Armée
    { px: +14.855, pz: -11.12, zSign: -1, key: 'paix' },        // Pilier gauche Grande-Armée
  ];

  reliefPlacements.forEach(({ px, pz, zSign, key }) => {
    const baseZ = pz + zSign * 0.78;
    // Piédestal saillant à consoles sculptées
    addBox(6.8, 2.9, 1.95, px, 4.3, baseZ, matStoneLight);
    addBox(7.35, 0.5, 2.2, px, 5.85, baseZ, matStoneLight);
    [-2.4, 2.4].forEach((cx) => {
      addBox(0.85, 1.4, 1.5, px + cx, 2.4, baseZ - zSign * 0.2, matStoneLight);
    });
    // Dalle haut-relief + niche encadrée
    addBox(6.9, 11.4, 0.45, px, 11.5, pz + zSign * 0.18, matStoneLight);
    addBox(6.3, 10.6, 0.55, px, 11.4, pz + zSign * 0.36, matReliefs[key]);

    // Composition sculpturale 3D multi-figures (figure allégorique haute + 4 figures en action + boucliers & lances)
    addCylinder(0.72, 1.1, 4.6, 10, px, 10.9, pz + zSign * 1.05, matStoneLight);
    const centralHead = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), matStoneLight);
    centralHead.position.set(px, 13.65, pz + zSign * 1.12);
    archGroup.add(centralHead);
    const armUp = addBox(0.32, 2.0, 0.32, px + zSign * 0.65, 14.3, pz + zSign * 1.15, matStoneLight);
    armUp.rotation.z = zSign * -0.4;

    if (key === 'marseillaise' || key === 'triomphe') {
      [-1, 1].forEach((ws) => {
        [0, 1].forEach((tier) => {
          const wing = addBox(3.3 - tier * 0.6, 0.62, 0.32, px + ws * (1.85 - tier * 0.3), 14.15 - tier * 0.58, pz + zSign * 1.05, matStoneLight);
          wing.rotation.z = ws * (-0.42 + tier * 0.14);
        });
      });
    } else {
      addCylinder(0.48, 0.65, 3.6, 8, px - 1.2, 8.2, pz + zSign * 1.1, matStoneLight);
    }

    [-2.2, -0.95, 0.95, 2.2].forEach((ox, fi) => {
      const fh = 3.8 + (fi % 2) * 0.7;
      addCylinder(0.42, 0.58, fh, 8, px + ox, 6.1 + fh * 0.5, pz + zSign * 0.98, matStoneLight);
      const fhSphere = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), matStoneLight);
      fhSphere.position.set(px + ox, 6.2 + fh + 0.25, pz + zSign * 1.05);
      archGroup.add(fhSphere);
      if (fi === 1 || fi === 2) {
        const buckler = addCylinder(0.62, 0.62, 0.16, 12, px + ox * 1.2, 7.8, pz + zSign * 1.38, matStoneLight, { cast: false });
        buckler.rotation.x = Math.PI * 0.5;
      }
      const spear = addCylinder(0.05, 0.06, 6.4, 6, px + ox * 0.9, 10.6, pz + zSign * 0.88, matStoneLight, { cast: false });
      spear.rotation.z = (fi - 1.5) * 0.16;
    });

    // Bas-relief rectangulaire narratif encadré au-dessus de l'imposte (faces Est/Ouest)
    addBox(8.0, 3.9, 0.58, px, 18.2, pz + zSign * 0.22, matStoneLight);
    addBox(7.2, 3.1, 0.44, px, 18.2, pz + zSign * 0.42, matBasRelief);
  });

  // 2 Grands Bas-Reliefs latéraux narratifs sur les façades Nord/Sud (au-dessus des Petites Voûtes)
  [-22.5, 22.5].forEach((fx) => {
    addBox(0.58, 4.6, 12.8, fx, 25.4, 0, matStoneLight);
    addBox(0.46, 3.7, 11.7, fx + Math.sign(fx) * 0.18, 25.4, 0, matBasRelief);
  });

  // E. Entablement, Grande Frise, Double rangée de Modillons & Attique aux 30 Boucliers & Glaives (y = 35,8 .. 49,5 m)
  addBox(45.9, 1.15, 23.3, 0, 36.2, 0, matStoneLight);
  addBox(45.6, 2.38, 23.0, 0, 37.9, 0, matFrieze);
  // Grande corniche saillante à denticules & modillons (y = 39,8 m)
  addBox(48.6, 1.3, 26.0, 0, 39.8, 0, matStoneLight);
  for (let mx = -23.0; mx <= 23.0; mx += 1.45) {
    addBox(0.56, 0.78, 24.8, mx, 39.15, 0, matStoneLight);
  }
  for (let mz = -11.4; mz <= 11.4; mz += 1.45) {
    addBox(47.4, 0.78, 0.56, 0, 39.15, mz, matStoneLight);
  }

  // Étage d'Attique (y = 40,4 .. 48,8 m) + 30 Boucliers gravés & Glaives verticaux (11 Est, 11 Ouest, 4 Nord, 4 Sud)
  addBox(44.8, 8.2, 22.2, 0, 44.5, 0, matStone);
  addBox(45.7, 0.7, 23.1, 0, 40.7, 0, matStoneLight);
  addBox(46.3, 0.95, 23.7, 0, 48.95, 0, matStoneLight);

  for (let s = 0; s < 11; s++) {
    const sx = -19.0 + s * 3.8;
    [-11.2, 11.2].forEach((sz) => {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.14, 8, 22), matStoneLight);
      rim.position.set(sx, 44.6, sz);
      archGroup.add(rim);
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.06, 1.06, 0.24, 22), matShield);
      disc.rotation.x = Math.PI * 0.5;
      disc.position.set(sx, 44.6, sz);
      archGroup.add(disc);
      const boss = addCylinder(0.28, 0.34, 0.22, 12, sx, 44.6, sz + Math.sign(sz) * 0.18, matGold);
      boss.rotation.x = Math.PI * 0.5;
      if (s < 10) {
        addBox(0.42, 7.6, 0.35, sx + 1.9, 44.6, sz, matStoneLight, { cast: false });
        addBox(0.14, 4.4, 0.18, sx + 1.9, 44.5, sz + Math.sign(sz) * 0.2, matStoneLight, { cast: false });
        addBox(0.48, 0.18, 0.22, sx + 1.9, 42.7, sz + Math.sign(sz) * 0.22, matGold, { cast: false });
      }
    });
  }
  for (let s = 0; s < 4; s++) {
    const sz = -6.0 + s * 4.0;
    [-22.5, 22.5].forEach((sx) => {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.14, 8, 22), matStoneLight);
      rim.rotation.y = Math.PI * 0.5;
      rim.position.set(sx, 44.6, sz);
      archGroup.add(rim);
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.06, 1.06, 0.24, 22), matShield);
      disc.rotation.z = Math.PI * 0.5;
      disc.position.set(sx, 44.6, sz);
      archGroup.add(disc);
      const boss = addCylinder(0.28, 0.34, 0.22, 12, sx + Math.sign(sx) * 0.18, 44.6, sz, matGold);
      boss.rotation.z = Math.PI * 0.5;
      if (s < 3) {
        addBox(0.35, 7.6, 0.42, sx, 44.6, sz + 2.0, matStoneLight, { cast: false });
        addBox(0.18, 4.4, 0.14, sx + Math.sign(sx) * 0.2, 44.5, sz + 2.0, matStoneLight, { cast: false });
      }
    });
  }

  // F. Terrasse Panoramique visitable (y = 49,55 m) : balustres tournés, édicule & jumelles panoramiques
  addBox(43.2, 0.32, 20.6, 0, 49.4, 0, matSidewalkStone, { cast: false });
  [-10.2, 10.2].forEach((bz) => {
    addBox(44.2, 0.52, 0.65, 0, 49.82, bz, matStoneLight);
    addBox(44.4, 0.18, 0.72, 0, 50.86, bz, matStoneLight, { cast: false });
    for (let bx = -21.0; bx <= 21.0; bx += 1.5) {
      addCylinder(0.14, 0.18, 0.86, 8, bx, 50.42, bz, matStoneLight, { cast: false });
    }
  });
  [-21.7, 21.7].forEach((bx) => {
    addBox(0.65, 0.52, 21.0, bx, 49.82, 0, matStoneLight);
    addBox(0.72, 0.18, 21.2, bx, 50.86, 0, matStoneLight, { cast: false });
    for (let bz = -9.6; bz <= 9.6; bz += 1.6) {
      addCylinder(0.14, 0.18, 0.86, 8, bx, 50.42, bz, matStoneLight, { cast: false });
    }
  });
  addBox(3.8, 2.35, 4.4, 0, 50.65, -4.8, matStone);
  addBox(4.3, 0.38, 4.9, 0, 51.95, -4.8, matStoneLight);
  addBox(1.5, 1.9, 0.2, 0, 50.5, -2.55, matBronzeDark, { cast: false });
  // 4 Tables d'orientation panoramiques + longues-vues
  [[0, 8.2, 0], [0, -8.2, Math.PI], [19.4, 0, Math.PI * 0.5], [-19.4, 0, -Math.PI * 0.5]].forEach(([tx, tz, ry]) => {
    const tbl = new THREE.Group();
    tbl.position.set(tx, 49.55, tz);
    tbl.rotation.y = ry;
    addBox(0.62, 1.05, 0.52, 0, 0.52, 0, matStoneLight, { parent: tbl });
    const plate = addBox(1.9, 0.12, 0.88, 0, 1.08, 0, matGold, { cast: false, parent: tbl });
    plate.rotation.x = 0.25;
    addCylinder(0.06, 0.08, 1.3, 8, 1.4, 0.65, 0, matBronzeDark, { cast: false, parent: tbl });
    const viewer = addCylinder(0.11, 0.09, 0.42, 8, 1.4, 1.32, 0, matBronzeDark, { cast: false, parent: tbl });
    viewer.rotation.x = Math.PI * 0.5;
    archGroup.add(tbl);
  });

  // G. Tombe du Soldat Inconnu : Dalle Sacrée gravée, Brasier aux Glaives & Bornes reliées par chaînes
  addBox(3.5, 0.14, 5.4, 0, 0.25, 0.2, matTombGranite, { cast: false });
  addBox(3.05, 0.04, 4.85, 0, 0.33, 0.2, matGold, { cast: false });
  addBox(2.85, 0.05, 4.6, 0, 0.34, 0.2, matSacredSlab, { cast: false });
  // Bouclier-brasier ciselé d'Edgar Brandt aux 12 glaives rayonnants
  addCylinder(0.95, 1.15, 0.2, 20, 0, 0.42, -1.25, matBronzeDark);
  addCylinder(0.6, 0.78, 0.16, 14, 0, 0.56, -1.25, matGold, { cast: false });
  for (let b = 0; b < 12; b++) {
    const ba = (b / 12) * Math.PI * 2;
    const sword = addBox(0.14, 0.04, 0.78, Math.cos(ba) * 0.72, 0.52, -1.25 + Math.sin(ba) * 0.72, matGold, { cast: false });
    sword.rotation.y = -ba + Math.PI * 0.5;
  }
  // Couronne de laurier en bronze doré déposée au pied de la Dalle
  const wreath = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.1, 8, 18), matGold);
  wreath.rotation.x = Math.PI * 0.5;
  wreath.position.set(0, 0.44, 1.85);
  archGroup.add(wreath);

  // 8 bornes-obus en bronze reliées par chaînes périphériques
  const bollardCoords = [
    [-2.1, -2.5], [0, -2.5], [2.1, -2.5],
    [2.1, 0.2], [2.1, 2.9], [0, 2.9],
    [-2.1, 2.9], [-2.1, 0.2],
  ];
  bollardCoords.forEach(([bx, bz], i) => {
    addCylinder(0.14, 0.19, 0.88, 8, bx, 0.64, bz, matBronzeDark);
    const [nx, nz] = bollardCoords[(i + 1) % bollardCoords.length];
    if (!(i === 4 || i === 5)) { // Laisse l'accès symbolique côté Est libre ou relié bas
      const len = Math.hypot(nx - bx, nz - bz);
      const chain = addCylinder(0.03, 0.03, len, 6, (bx + nx) * 0.5, 0.88, (bz + nz) * 0.5, matBronzeDark, { cast: false });
      chain.rotation.z = Math.PI * 0.5;
      chain.rotation.y = -Math.atan2(nz - bz, nx - bx);
    }
  });
  addLocalCircleCollider(0, 0.2, 2.75);

  // Lumière chaude dirigée vers les caissons & gravures de la Grande Voûte (LOD 0 uniquement)
  const vaultLight = new THREE.PointLight(0xffcb82, 15, 48, 1.35);
  vaultLight.position.set(0, 18.0, 0);
  vaultLight.castShadow = false;
  archGroup.add(vaultLight);

  // Flamme Éternelle animée (3 flammes émissives imbriquées + PointLight chaude)
  flameGroup.position.set(0, 0.65, -1.25);
  const matFlameOuter = new THREE.MeshBasicMaterial({ color: 0xff6a1a, transparent: true, opacity: 0.74, side: THREE.DoubleSide });
  const matFlameMid = new THREE.MeshBasicMaterial({ color: 0xffb338, transparent: true, opacity: 0.86, side: THREE.DoubleSide });
  const matFlameCore = new THREE.MeshBasicMaterial({ color: 0xfff4bd, transparent: true, opacity: 0.96, side: THREE.DoubleSide });

  const flameOuter = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.05, 10), matFlameOuter);
  flameOuter.position.y = 0.52;
  const flameMid = new THREE.Mesh(new THREE.ConeGeometry(0.21, 0.82, 10), matFlameMid);
  flameMid.position.y = 0.42;
  const flameCore = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.56, 8), matFlameCore);
  flameCore.position.y = 0.30;
  flameGroup.add(flameOuter, flameMid, flameCore);

  const flameLight = new THREE.PointLight(0xff8e36, 18, 22, 1.6);
  flameLight.position.set(0, 1.2, 0);
  flameGroup.add(flameLight);

  /**
   * ==========================================================================
   * 2. PLACE CHARLES-DE-GAULLE : ÉTOILE, RUE DE PRESBOURG/TILSITT & 12 HÔTELS EN U
   * ==========================================================================
   */
  // A. Parvis central bicolore à 12 branches (r = 45,5 m)
  const parvisMesh = new THREE.Mesh(new THREE.CylinderGeometry(45.5, 45.8, 0.18, 48), matStarPavement);
  parvisMesh.position.set(0, 0.17, 0);
  parvisMesh.receiveShadow = true;
  envGroup.add(parvisMesh);

  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    addCylinder(0.16, 0.2, 0.95, 6, Math.cos(a) * 44.4, 0.65, Math.sin(a) * 44.4, matGranitePlinth, { parent: envGroup });
  }

  // B. Chaussée pavée du Rond-Point de l'Étoile (r = 45,5 .. 84 m)
  const tSegs = 64;
  const pSegs = 2;
  const ringGeo = new THREE.RingGeometry(45.5, 84, tSegs, pSegs);
  const ringUV = ringGeo.attributes.uv;
  for (let j = 0; j <= pSegs; j++) {
    for (let i = 0; i <= tSegs; i++) {
      ringUV.setXY(j * (tSegs + 1) + i, (i / tSegs) * 28, (j / pSegs) * 3);
    }
  }
  ringGeo.rotateX(-Math.PI * 0.5);
  const ringRoadMesh = new THREE.Mesh(ringGeo, matRoundaboutCobble);
  ringRoadMesh.position.y = 0.24;
  ringRoadMesh.receiveShadow = true;
  envGroup.add(ringRoadMesh);

  // Anneau extérieur Rue de Presbourg & Rue de Tilsitt (r = 130,5 .. 143,5 m) ceinturant les Hôtels des Maréchaux
  const presbourgRoadGeo = new THREE.RingGeometry(132.5, 141.5, 72, 1);
  presbourgRoadGeo.rotateX(-Math.PI * 0.5);
  const presbourgRoadMesh = new THREE.Mesh(presbourgRoadGeo, matPresbourgAsphalt);
  presbourgRoadMesh.position.y = 0.08;
  presbourgRoadMesh.receiveShadow = true;
  envGroup.add(presbourgRoadMesh);

  [[130.0, 132.6], [141.4, 144.0]].forEach(([rIn, rOut]) => {
    const swGeo = new THREE.RingGeometry(rIn, rOut, 72, 1);
    swGeo.rotateX(-Math.PI * 0.5);
    const swMesh = new THREE.Mesh(swGeo, matSidewalkStone);
    swMesh.position.y = 0.11;
    swMesh.receiveShadow = true;
    envGroup.add(swMesh);
  });

  // Passages piétons & îlots refuges aux débouchés des 12 avenues (r = 85 m)
  for (let k = 0; k < 12; k++) {
    const a = k * (Math.PI / 6);
    const rx = -Math.sin(a) * 85.2;
    const rz = Math.cos(a) * 85.2;
    const refMesh = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.24, 5.2), matGranitePlinth);
    refMesh.position.set(rx, 0.22, rz);
    refMesh.rotation.y = Math.PI - a;
    refMesh.receiveShadow = true;
    envGroup.add(refMesh);
  }

  // C. Deux trémies d'accès du Passage du Souvenir (Champs-Élysées +36 et Grande-Armée -36)
  [-36, 36].forEach((tz) => {
    const sgn = Math.sign(tz);
    addBox(3.6, 0.85, 7.6, 0, 0.55, tz, matGranitePlinth, { parent: envGroup });
    addBox(2.6, 0.18, 6.2, 0, 0.22, tz, matTombGranite, { cast: false, parent: envGroup });
    addBox(3.8, 0.95, 0.22, 0, 0.65, tz + sgn * 3.8, matBronzeDark, { parent: envGroup });
  });

  // D. Les 12 Hôtels des Maréchaux en U (Hittorff 1854) + Jardins d'honneur clos de grilles & lucarnes
  const lampPositions = [];
  const gardenTrees = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    lampPositions.push([Math.cos(a) * 42.5, 0.26, Math.sin(a) * 42.5]);
  }

  for (let k = 0; k < 12; k++) {
    const midTheta = (k + 0.5) * (Math.PI / 6);
    const inX = -Math.sin(midTheta);
    const inZ = Math.cos(midTheta);
    const tanX = Math.cos(midTheta);
    const tanZ = Math.sin(midTheta);

    const isChampsAdjacent = k === 0 || k === 11;
    const isFochAdjacent = k === 4 || k === 5 || k === 6;
    const hotelR = 109.5;
    const hotelW = isChampsAdjacent ? 20.5 : isFochAdjacent ? 21.5 : 26.5;
    const hotelD = 13.5;
    const hotelH = 19.6;

    const hg = new THREE.Group();
    hg.position.set(inX * hotelR, 0, inZ * hotelR);
    hg.rotation.y = Math.PI - midTheta;
    envGroup.add(hg);

    // Trottoir sectoriel & Jardin d'honneur fleuri côté rond-point (localZ = +7 .. +19 -> r = 90.5 .. 102.5)
    addBox(hotelW + 5.2, 0.16, 33.5, 0, 0.04, 2.5, matSidewalkStone, { cast: false, parent: hg });
    addBox(hotelW - 1.5, 0.2, 9.6, 0, 0.11, hotelD * 0.5 + 5.6, matGardenLawn, { cast: false, parent: hg });
    // Muret bas + grille en fer forgé à pointes dorées bordant le rond-point
    addBox(hotelW + 1.0, 0.65, 0.42, 0, 0.35, hotelD * 0.5 + 10.8, matStoneLight, { parent: hg });
    addBox(hotelW + 1.0, 1.15, 0.14, 0, 1.25, hotelD * 0.5 + 10.8, matIronRail, { parent: hg });
    addBox(hotelW + 1.0, 0.16, 0.18, 0, 1.85, hotelD * 0.5 + 10.8, matGold, { cast: false, parent: hg });

    // 2 arbres dans chaque jardin d'honneur (instanciés)
    [-hotelW * 0.28, hotelW * 0.28].forEach((tx) => {
      const worldPtX = inX * (hotelR - (hotelD * 0.5 + 5.6)) + tanX * tx;
      const worldPtZ = inZ * (hotelR - (hotelD * 0.5 + 5.6)) + tanZ * tx;
      gardenTrees.push([worldPtX, worldPtZ]);
    });

    // Corps principal Hittorff + deux ailes en retour vers Rue de Presbourg/Tilsitt formant cour
    addBox(hotelW, hotelH, hotelD, 0, hotelH * 0.5 + 0.08, 0, matMarechaux, { parent: hg });
    addBox(hotelW + 0.6, 0.55, hotelD + 0.6, 0, hotelH + 0.3, 0, matStoneLight, { cast: false, parent: hg });
    addBox(hotelW - 1.0, 3.8, hotelD - 1.0, 0, hotelH + 2.35, 0, matSlateRoof, { parent: hg });
    [-hotelW * 0.3, 0, hotelW * 0.3].forEach((cx) => {
      addBox(1.5, 1.9, 1.2, cx, hotelH + 4.8, 0, matStone, { cast: false, parent: hg });
      // Lucarnes en zinc sur la toiture mansardée
      addBox(1.65, 1.95, 1.35, cx, hotelH + 1.85, hotelD * 0.45, matSlateRoof, { cast: false, parent: hg });
    });

    // Ailes latérales en retour encadrant la cour arrière
    const wingLen = isChampsAdjacent ? 8.5 : 13.5;
    const wingW = 6.2;
    [-1, 1].forEach((ws) => {
      const wx = ws * (hotelW * 0.5 - wingW * 0.5);
      const wz = -(hotelD * 0.5 + wingLen * 0.5 - 0.5);
      addBox(wingW, hotelH - 0.5, wingLen, wx, (hotelH - 0.5) * 0.5 + 0.08, wz, matMarechaux, { parent: hg });
      addBox(wingW - 0.6, 3.2, wingLen - 0.6, wx, hotelH + 1.5, wz, matSlateRoof, { parent: hg });
    });

    const lampR = 86.2;
    lampPositions.push([inX * lampR - tanX * 3.5, 0.12, inZ * lampR - tanZ * 3.5]);
    lampPositions.push([inX * lampR + tanX * 3.5, 0.12, inZ * lampR + tanZ * 3.5]);
  }

  // E. Candélabres & Arbres des Jardins d'Honneur instanciés (4 draw calls)
  const polesInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.11, 0.19, 4.6, 7), matLampPost, lampPositions.length);
  const globesInst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.42, 10, 8), matLampGlow, lampPositions.length);
  const gTrunkMat = new THREE.MeshStandardMaterial({ color: 0x524030, roughness: 0.92 });
  const gLeafMat = new THREE.MeshStandardMaterial({ color: 0x4d7b3b, roughness: 0.84 });
  const gTrunksInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.28, 3.8, 6), gTrunkMat, gardenTrees.length);
  const gCrownsInst = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(2.35, 1), gLeafMat, gardenTrees.length);

  const td = new THREE.Object3D();
  lampPositions.forEach(([lx, ly, lz], i) => {
    td.position.set(lx, ly + 2.3, lz);
    td.rotation.set(0, 0, 0);
    td.scale.set(1, 1, 1);
    td.updateMatrix();
    polesInst.setMatrixAt(i, td.matrix);
    td.position.set(lx, ly + 4.75, lz);
    td.updateMatrix();
    globesInst.setMatrixAt(i, td.matrix);
  });
  gardenTrees.forEach(([gx, gz], i) => {
    const sc = 0.85 + ((i * 11) % 5) * 0.06;
    td.position.set(gx, 1.9 * sc, gz);
    td.rotation.set(0, (i * 1.1) % 6.28, 0);
    td.scale.set(sc, sc, sc);
    td.updateMatrix();
    gTrunksInst.setMatrixAt(i, td.matrix);
    td.position.set(gx, 4.8 * sc, gz);
    td.scale.set(sc * 1.1, sc * 0.88, sc * 1.1);
    td.updateMatrix();
    gCrownsInst.setMatrixAt(i, td.matrix);
  });
  polesInst.instanceMatrix.needsUpdate = true;
  globesInst.instanceMatrix.needsUpdate = true;
  gTrunksInst.instanceMatrix.needsUpdate = true;
  gCrownsInst.instanceMatrix.needsUpdate = true;

  mergeStaticGroupByMaterial(archGroup);
  mergeStaticGroupByMaterial(envGroup);
  envGroup.add(polesInst, globesInst, gTrunksInst, gCrownsInst);

  /**
   * ==========================================================================
   * 3. SOL VISITABLE MULTI-NIVEAUX (PARVIS ÉTOILE + TERRASSE PANORAMIQUE 50 m)
   * ==========================================================================
   */
  const invRot = -ARC_ROT_Y;
  const cosI = Math.cos(invRot);
  const sinI = Math.sin(invRot);

  function getFloorHeightAt(wx, wz, currentY = 19.75) {
    const dx = wx - ARC_WORLD_POS.x;
    const dz = wz - ARC_WORLD_POS.z;
    const lx = dx * cosI + dz * sinI;
    const lz = -dx * sinI + dz * cosI;

    // Terrasse panoramique au sommet de l'Arc (y_local = 49,55 m -> y_world = 67,55 m)
    if (currentY > 52 && Math.abs(lx) < 20.8 && Math.abs(lz) < 9.5) {
      return ARC_WORLD_POS.y + 49.55;
    }

    const r = Math.hypot(lx, lz);
    if (r < 45.6) return ARC_WORLD_POS.y + 0.26;
    if (r < 85.0) return ARC_WORLD_POS.y + 0.24;

    const ce = worldToChampsLocal(wx, wz);
    if (ce.lz >= 84 && ce.lz <= 2255 && Math.abs(ce.lx) < 130) {
      const baseElev = getParisElevation(wx, wz);
      if (ce.lz >= 1995) return baseElev + 0.16;
      if (Math.abs(ce.lx) < 15.2) return baseElev + 0.18;
      if (Math.abs(ce.lx) < 36.0) return baseElev + 0.28;
      return baseElev + 0.14;
    }
    return getParisElevation(wx, wz) + 0.10;
  }

  // --- PROLOGUE 360° & 7 POINTS D'INTÉRÊT HISTORIQUES ---
  const introChapter = {
    id: 'arc-intro-360',
    title: 'Histoire de l’Arc de Triomphe — Tour 360°',
    era: '1806 – 1836 • Néoclassicisme impérial',
    location: 'Place Charles-de-Gaulle (Étoile), Paris',
    history:
      "Commandé par Napoléon Ier dès le lendemain d'Austerlitz en 1806 et dessiné par l'architecte Jean Chalgrin, l'Arc de Triomphe de l'Étoile s'inspire de l'Arc de Titus à Rome tout en multipliant ses dimensions à l'échelle héroïque : 49,5 mètres de hauteur, 44,8 mètres de largeur et 22,2 mètres de profondeur. Achevé sous Louis-Philippe en 1836, il trône au sommet de la colline de Chaillot au centre de l'étoile à douze avenues.",
    anecdote:
      "Depuis le 11 novembre 1923, une Flamme Éternelle est ravivée chaque soir à 18h30 sur la Tombe du Soldat inconnu inhumé sous la Grande Voûte.",
    voiceover:
      "Bienvenue sur la Place Charles-de-Gaulle, face à l'Arc de Triomphe de l'Étoile. " +
      "Pendant ce tour panoramique à 360 degrés, remontons l'épopée de ce monument haut de près de cinquante mètres. " +
      "Commandé par Napoléon Premier en 1806 pour glorifier la Grande Armée après Austerlitz, le chantier fut confié à Jean Chalgrin et ne s'acheva que trente ans plus tard, en 1836. " +
      "Au pied de ses quatre piliers monumentaux se dressent d'immenses hauts-reliefs sculptés, dont la célèbre Marseillaise de François Rude. " +
      "Sous sa grande voûte à caissons reposent depuis 1920 les restes du Soldat inconnu, veillés par la Flamme Éternelle, tandis que ses parois conservent gravés les noms de 660 généraux de la Révolution et de l'Empire. " +
      "Découvrons ensemble les huit étapes incontournables de l'Arc, de sa terrasse panoramique aux Champs-Élysées.",
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
      id: 'arc-facade-champs',
      title: 'La Façade Est & l’Axe Historique',
      shortTitle: 'Façade Champs-Élysées',
      era: '1806 – 1836 • Jean Chalgrin',
      location: 'Parvis Est • Perspective du Louvre',
      localMarker: [0, 32, 13],
      localCam: [14, 24, 68],
      localTarget: [0, 26, 2],
      localFps: [0, 0.3, 40],
      history:
        "Orientée rigoureusement dans l'axe du Jardin des Tuileries, de l'Obélisque de la Concorde et des Champs-Élysées, la façade orientale déploie une symétrie néoclassique puissante autour d'une Grande Voûte haute de 29,19 mètres et large de 14,62 mètres.",
      anecdote:
        "L'Arc de Triomphe est presque deux fois plus haut que l'Arc de Constantin à Rome dont Chalgrin s'inspira pour les proportions.",
    }),
    makePoi({
      id: 'arc-marseillaise',
      title: '« Le Départ des Volontaires de 1792 » (La Marseillaise)',
      shortTitle: 'La Marseillaise (Rude)',
      era: '1833 – 1836 • François Rude',
      location: 'Pilier Sud-Est (droite côté Champs-Élysées)',
      localMarker: [14.8, 12, 13.5],
      localCam: [24, 13, 33],
      localTarget: [14.8, 10.5, 11.2],
      localFps: [16, 0.3, 28],
      history:
        "Chef-d'œuvre de la sculpture romantique réalisé par François Rude, ce haut-relief monumental haut de près de 12 mètres figure les volontaires de 1792 appelés aux frontières par le génie ailé de la Liberté poussant un cri héroïque au sommet.",
      anecdote:
        "L'œuvre reçut dès son inauguration le surnom populaire de « La Marseillaise », tant l'élan du génie ailé semble chanter l'hymne national français.",
    }),
    makePoi({
      id: 'arc-soldat-inconnu',
      title: 'Tombe du Soldat Inconnu & Flamme Éternelle',
      shortTitle: 'Soldat Inconnu & Flamme',
      era: '11 novembre 1920 / 1923',
      location: 'Sous la Grande Voûte',
      localMarker: [0, 2.8, -1.2],
      localCam: [6.8, 2.8, 8.8],
      localTarget: [0, 0.9, -0.6],
      localFps: [4.2, 0.3, 5.5],
      history:
        "Inhumé solennellement sous la voûte le 28 janvier 1921 après son transfert depuis la citadelle de Verdun, le Soldat inconnu représente les millions de combattants tombés lors de la Première Guerre mondiale sans avoir pu être identifiés.",
      anecdote:
        "Allumée le 11 novembre 1923 par André Maginot, la Flamme du Souvenir brûle dans le bronze d'un canon entouré d'un bouclier aux glaives ciselés et ne s'est jamais éteinte depuis.",
    }),
    makePoi({
      id: 'arc-grande-voute',
      title: 'Grande Voûte à Caissons & 660 Généraux',
      shortTitle: 'Voûtes & 660 Généraux',
      era: '1836 • Panthéon militaire',
      location: 'Croisée intérieure des voûtes',
      localMarker: [0, 22, 0],
      localCam: [0, 4.2, 16],
      localTarget: [0, 22, -2],
      localFps: [-3.5, 0.3, 6.0],
      history:
        "Les intrados des grandes et petites voûtes sont creusés de caissons octogonaux ornés de rosaces sculptées. Sur les piédroits de pierre calcaire sont gravés 660 noms de personnalités militaires de la Révolution et de l'Empire, répartis par points cardinaux selon le théâtre de leurs campagnes.",
      anecdote:
        "Tu peux repérer sur la pierre certains noms soulignés d'un trait net : ce sont les généraux tombés au champ d'honneur, tels Lannes, Desaix, Kléber, Marceau ou Hoche.",
    }),
    makePoi({
      id: 'arc-frise-boucliers',
      title: 'Grande Frise d’Entablement & 30 Boucliers',
      shortTitle: 'Frise & 30 Boucliers',
      era: 'Couronnement • 36 à 49 m',
      location: 'Entablement & Étage d’attique',
      localMarker: [0, 43, 12],
      localCam: [-28, 45, 38],
      localTarget: [0, 42, 6],
      localFps: [-32, 0.3, 30],
      history:
        "À 37 mètres de haut court tout autour du monument une frise continue de près de 130 mètres mettant en scène le Départ et le Retour des Armées. Au-dessus de la corniche à modillons, l'attique porte 30 boucliers circulaires où sont gravées les grandes victoires républicaines et impériales.",
      anecdote:
        "Chaque face principale porte exactement 11 boucliers (et 4 sur chaque petit côté), soit un total de 30 boucliers de batailles couronnant la silhouette néoclassique.",
    }),
    makePoi({
      id: 'arc-terrasse-50m',
      title: 'Terrasse Panoramique à 50 m — Tout Paris à 360°',
      shortTitle: 'Terrasse Panoramique (50 m)',
      era: 'Altitude 67,5 m • Belvédère',
      location: 'Sommet visitable de l’Arc de Triomphe',
      localMarker: [0, 51.8, 4],
      localCam: [-8, 55.2, -7.5],
      localTarget: [0, 32, 240],
      localFps: [0, 49.6, 6.0],
      history:
        "Accessible au public après l'ascension des 284 marches de l'escalier intérieur en colimaçon, la terrasse sommitale offre sans doute la vue urbaine la plus spectaculaire de Paris : l'alignement géométrique parfait de l'Axe Historique et des douze avenues en étoile.",
      anecdote:
        "Clique sur « Explorer ici » pour te téléporter directement en mode piéton sur le toit de l'Arc de Triomphe, longer la balustrade de pierre et admirer la Tour Eiffel et les Champs-Élysées !",
    }),
    makePoi({
      id: 'arc-place-etoile',
      title: 'Place de l’Étoile, 12 Avenues & Hôtels des Maréchaux',
      shortTitle: 'Étoile & 12 Avenues',
      era: '1854 • Haussmann & Hittorff',
      location: 'Place Charles-de-Gaulle',
      localMarker: [78, 12, 54],
      localCam: [92, 95, 138],
      localTarget: [0, 18, 0],
      localFps: [40, 0.3, 18],
      history:
        "Réaménagée en 1854 par le baron Haussmann et l'architecte Jacques Hittorff, la place fait converger douze grandes avenues tracées en étoile parfaite tous les 30°, ceinturées d'une couronne harmonieuse d'hôtels particuliers uniformes appelés Hôtels des Maréchaux.",
      anecdote:
        "Malgré ses 12 voies convergentes très animées sur le rond-point pavé, la législation spécifique du rond-point de l'Étoile applique toujours la priorité à droite aux véhicules entrants !",
    }),
    makePoi({
      id: 'arc-champs-elysees',
      title: "Avenue des Champs-Élysées, Fouquet's & Concorde",
      shortTitle: "Champs-Élysées & Concorde",
      era: '1667 – 1994 • Le Nôtre, Hittorff & Wilmotte',
      location: 'De l’Étoile à la Concorde (2 122 m)',
      localMarker: [0, 22, 485],
      localCam: [14, 38, 620],
      localTarget: [-8, 18, 360],
      localFps: [-22, -6.2, 465],
      history:
        "Surnommée « la plus belle avenue du monde », l'artère prolonge la perspective de Le Nôtre sur près de deux kilomètres : le Haut des Champs bordé de palais haussmanniens et maisons emblématiques (Publicis, Le Fouquet's, Louis Vuitton, Ladurée), le Rond-Point aux six fontaines, les Jardins avec Grand et Petit Palais, puis la Place de la Concorde et l'Obélisque de Louxor.",
      anecdote:
        "En 1994, Bernard Huet et Jean-Michel Wilmotte ont réaménagé les larges contre-allées en granit rose et planté une double rangée de platanes taillés au carré tout le long de la montée vers l'Arc.",
    }),
  ];

  /**
   * ==========================================================================
   * 4. ANIMATION FLAMME ÉTERNELLE & ILLUMINATION NOCTURNE DE L'ARC
   * ==========================================================================
   */
  let elapsed = 0;
  let currentLod = 0;

  function setLodLevel(level, camDist = 200) {
    currentLod = level;
    // L'Arc (50 m) reste visible à toute distance dans la skyline ; seul le mobilier de place s'efface au-delà de 2,4 km
    envGroup.visible = camDist < 2400;
    flameGroup.visible = level < 2;
    vaultLight.visible = level === 0;
    polesInst.visible = level === 0;
    globesInst.visible = level === 0;
    gTrunksInst.visible = level < 2;
    gCrownsInst.visible = level < 2;
  }

  function update(dt, nightFactor = 0.1) {
    const clampedDt = Math.min(dt, 0.05);
    elapsed += clampedDt;

    // 1. Animation organique & vacillante de la Flamme Éternelle
    if (flameGroup.visible) {
      const f1 = Math.sin(elapsed * 9.5) * 0.14 + Math.cos(elapsed * 15.2) * 0.09;
      const f2 = Math.cos(elapsed * 11.8) * 0.11;
      flameOuter.scale.set(1 + f2 * 0.45, 0.96 + f1 * 0.75, 1 - f2 * 0.35);
      flameOuter.rotation.z = f2 * 0.4;
      flameOuter.rotation.x = f1 * 0.35;

      flameMid.scale.set(1 - f1 * 0.35, 1.0 + f2 * 0.7, 1 + f1 * 0.3);
      flameCore.scale.set(1 + f2 * 0.25, 1.05 - f1 * 0.5, 1);

      const useFlameLight = currentLod === 0;
      flameLight.visible = useFlameLight;
      if (useFlameLight) {
        flameLight.intensity = 15 + f1 * 9 + nightFactor * 16;
      }
      vaultLight.intensity = useFlameLight ? 12 + nightFactor * 16 : 0;
    } else {
      flameLight.visible = false;
      vaultLight.visible = false;
    }

    // 2. Illumination nocturne dorée de l'Arc de Triomphe, fenêtres des Maréchaux & candélabres de l'Étoile
    const glow = Math.max(0, (nightFactor - 0.26) / 0.74);
    nightLitStoneMats.forEach((mat) => {
      mat.emissive.setHex(0xd49a4c);
      mat.emissiveIntensity = glow * 0.38;
    });
    matMarechaux.emissiveIntensity = 0.04 + glow * 0.92;
    matLampGlow.emissiveIntensity = 0.22 + glow * 1.45;
  }

  return {
    id: 'arc-de-triomphe',
    name: "Arc de Triomphe de l'Étoile",
    root,
    colliders,
    circleColliders,
    worldBounds: {
      minX: -3860,
      maxX: -1560,
      minZ: -1360,
      maxZ: -60,
    },
    fpsSpawnPos: localToWorld(0, 0.35, 32),
    fpsSpawnTarget: localToWorld(0, 12, 0),
    getFloorHeightAt,
    setLodLevel,
    introChapter,
    pois,
    update,
  };
}
