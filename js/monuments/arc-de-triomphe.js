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
  const w = 384;
  const h = 640;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  // Fond de stèle sculptée en pierre calcaire blonde
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#ddd1ba');
  bg.addColorStop(0.5, '#e8dec9');
  bg.addColorStop(1, '#cfc2aa');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Cadre architectural en creux
  ctx.strokeStyle = '#9c8e74';
  ctx.lineWidth = 10;
  ctx.strokeRect(10, 10, w - 20, h - 20);

  // Composition sculpturale en clair-obscur selon le groupe
  if (variant === 'marseillaise') {
    // Génie ailé de la Liberté (haut) menant les volontaires en rang (bas)
    ctx.fillStyle = '#c2b499';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.25, 138, 92, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f3ebdc';
    for (let feather = -5; feather <= 5; feather++) {
      ctx.save();
      ctx.translate(w * 0.5, h * 0.27);
      ctx.rotate(feather * 0.19);
      ctx.fillRect(-10, -130, 16, 118);
      ctx.restore();
    }
  } else if (variant === 'triomphe') {
    // Cortot : Napoléon couronné par la Victoire et encadré de la Renommée
    ctx.fillStyle = '#f3ebdc';
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.34, 72, 0, Math.PI * 2);
    ctx.fill();
  }

  // Figures héroïques sculptées & draperies
  const figs = [
    [0.24, 0.62, 34, 150],
    [0.44, 0.56, 38, 175],
    [0.62, 0.59, 36, 165],
    [0.78, 0.66, 32, 145],
  ];
  figs.forEach(([fx, fy, fw, fh], i) => {
    const cx = w * fx;
    const cy = h * fy;
    ctx.fillStyle = 'rgba(72, 62, 48, 0.34)';
    ctx.beginPath();
    ctx.ellipse(cx + 8, cy + 8, fw * 0.78, fh * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    const fg = ctx.createLinearGradient(cx - fw, cy, cx + fw, cy);
    fg.addColorStop(0, '#eee5d4');
    fg.addColorStop(0.6, '#d9ccb3');
    fg.addColorStop(1, '#afa084');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.ellipse(cx, cy, fw * 0.72, fh * 0.48, (i - 1.5) * 0.08, 0, Math.PI * 2);
    ctx.fill();

    // Tête / casque sculpté
    ctx.fillStyle = '#f4ede0';
    ctx.beginPath();
    ctx.arc(cx, cy - fh * 0.52, 16, 0, Math.PI * 2);
    ctx.fill();
  });

  // Lances, glaives et drapeaux verticaux
  ctx.strokeStyle = '#efe7d6';
  ctx.lineWidth = 4;
  [-70, -18, 36, 84].forEach((ox, idx) => {
    ctx.beginPath();
    ctx.moveTo(w * 0.5 + ox, h * 0.85);
    ctx.lineTo(w * 0.5 + ox + (idx - 1.5) * 18, h * 0.18);
    ctx.stroke();
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createCofferVaultTexture() {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#dfd3bc';
  ctx.fillRect(0, 0, size, size);

  const cells = 4;
  const step = size / cells;
  for (let r = 0; r < cells; r++) {
    for (let col = 0; col < cells; col++) {
      const x = col * step;
      const y = r * step;
      const cx = x + step * 0.5;
      const cy = y + step * 0.5;

      // Caisson mouluré octogonal à plusieurs degrés d'ombre
      ctx.fillStyle = '#b9ab90';
      ctx.fillRect(x + 8, y + 8, step - 16, step - 16);
      ctx.fillStyle = '#998b71';
      ctx.fillRect(x + 18, y + 18, step - 36, step - 36);
      ctx.fillStyle = '#84765d';
      ctx.fillRect(x + 28, y + 28, step - 56, step - 56);

      // Rosace sculptée centrale dorée/ivoire
      ctx.fillStyle = '#f2e8d4';
      ctx.beginPath();
      for (let p = 0; p < 8; p++) {
        const a = (p / 8) * Math.PI * 2;
        const px = cx + Math.cos(a) * 15;
        const py = cy + Math.sin(a) * 15;
        ctx.moveTo(px + 9, py);
        ctx.arc(px, py, 9, 0, Math.PI * 2);
      }
      ctx.fill();

      ctx.fillStyle = '#d4af5e';
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.fill();
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
  const w = 512;
  const h = 1024;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#dfd3bc';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#9c8f76';
  ctx.lineWidth = 6;
  ctx.strokeRect(14, 14, w - 28, h - 28);

  // Cartouche supérieur des grandes victoires avec couronne de laurier
  ctx.fillStyle = '#cfc1a7';
  ctx.fillRect(32, 34, w - 64, 128);
  ctx.strokeStyle = '#b4944e';
  ctx.lineWidth = 3;
  ctx.strokeRect(38, 40, w - 76, 116);
  ctx.fillStyle = '#473e30';
  ctx.font = 'bold 26px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('AUSTERLITZ • IÉNA', w * 0.5, 86);
  ctx.fillText('FRIEDLAND • WAGRAM', w * 0.5, 126);

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

  ctx.font = 'bold 17px Georgia, serif';
  ctx.textAlign = 'left';
  for (let col = 0; col < 2; col++) {
    const xBase = col === 0 ? 44 : 268;
    for (let row = 0; row < 28; row++) {
      const [name, fallen] = names[(row + col * 11) % names.length];
      const y = 212 + row * 27;
      ctx.fillStyle = '#4f4537';
      ctx.fillText(name, xBase, y);
      if (fallen) {
        // Les généraux morts au combat sont soulignés sur l'Arc de Triomphe
        ctx.fillStyle = '#6b5b44';
        ctx.fillRect(xBase, y + 3, ctx.measureText(name).width, 2);
      }
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createGrandFriezeTexture() {
  const w = 1024;
  const h = 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#d5c7ad';
  ctx.fillRect(0, 0, w, h);

  // Moulures haut & bas de la Grande Frise
  ctx.fillStyle = '#b4a589';
  ctx.fillRect(0, 0, w, 10);
  ctx.fillRect(0, h - 10, w, 10);

  // Frise continue de 48 silhouettes de soldats, cavaliers et allégories en bas-relief
  for (let i = 0; i < 48; i++) {
    const x = i * 21.3 + 8;
    const stride = i % 3 === 0 ? 6 : 0;
    ctx.fillStyle = 'rgba(85, 74, 58, 0.36)';
    ctx.fillRect(x + 3, 28, 12, 82);
    ctx.fillStyle = '#efe7d6';
    ctx.fillRect(x, 30, 11, 78);
    ctx.beginPath();
    ctx.arc(x + 5.5, 24 - stride * 0.3, 6, 0, Math.PI * 2);
    ctx.fill();
    if (i % 4 === 0) {
      // Drapeau ou lance inclinée
      ctx.strokeStyle = '#efe7d6';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x + 9, 105);
      ctx.lineTo(x + 22, 14);
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

function createMarechauxFacadeTexture() {
  const w = 512;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  // Hôtels des Maréchaux (Hittorff 1854) : façade blonde symétrique à arcades
  ctx.fillStyle = '#e4d9c4';
  ctx.fillRect(0, 0, w, h);

  // Refends réguliers
  ctx.fillStyle = 'rgba(95, 84, 68, 0.14)';
  for (let y = 0; y < h; y += 22) {
    ctx.fillRect(0, y, w, 1.5);
  }

  // Rez-de-chaussée à arcades en plein cintre
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

  // 3 étages nobles encadrés de pilastres
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
  const matReliefs = {
    marseillaise: new THREE.MeshStandardMaterial({ map: createHighReliefTexture('marseillaise'), roughness: 0.75, emissive: new THREE.Color(0x000000) }),
    triomphe: new THREE.MeshStandardMaterial({ map: createHighReliefTexture('triomphe'), roughness: 0.75, emissive: new THREE.Color(0x000000) }),
    resistance: new THREE.MeshStandardMaterial({ map: createHighReliefTexture('resistance'), roughness: 0.75, emissive: new THREE.Color(0x000000) }),
    paix: new THREE.MeshStandardMaterial({ map: createHighReliefTexture('paix'), roughness: 0.75, emissive: new THREE.Color(0x000000) }),
  };
  const nightLitStoneMats = [matStone, matStoneLight, matVaultCoffer, matFrieze, ...Object.values(matReliefs)];

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
  const matMarechaux = new THREE.MeshStandardMaterial({ map: createMarechauxFacadeTexture(), roughness: 0.82 });
  const matSlateRoof = new THREE.MeshStandardMaterial({ color: 0x3b4654, roughness: 0.54, metalness: 0.22 });
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

  // A. 4 Grands Piliers d'angle (|lx| ∈ [7.31, 22.40], |lz| ∈ [4.22, 11.10]) + Socles granit + Impostes
  [-1, 1].forEach((sx) => {
    [-1, 1].forEach((sz) => {
      const px = sx * 14.855;
      const pz = sz * 7.66;
      addBox(15.09, ENTABL_Y, 6.88, px, ENTABL_Y * 0.5, pz, matStone);
      // Socle mouluré en granit
      addBox(15.65, 2.55, 7.45, px, 1.28, pz, matGranitePlinth);
      // Corniche de socle & bandeau d'imposte de la Petite Voûte (y = 14,46 m)
      addBox(15.5, 0.55, 7.35, px, 2.75, pz, matStoneLight, { cast: false });
      addBox(15.6, 0.88, 7.4, px, P_SPRING, pz, matStoneLight);

      // Colliders piétons à l'intérieur du pilier (permet le passage libre sous Grande et Petite Voûtes)
      [-4.4, 0, 4.4].forEach((ox) => {
        [-1.3, 1.3].forEach((oz) => {
          addLocalCircleCollider(px + ox, pz + oz, 2.65);
        });
      });
    });

    // Massif plein au-dessus de la Petite Voûte (y = 18.68 .. 35.80) + imposte Grande Voûte (y = 21.88)
    const pPeak = P_SPRING + P_HALF; // 18.68
    addBox(15.09, ENTABL_Y - pPeak, P_HALF * 2, sx * 14.855, (ENTABL_Y + pPeak) * 0.5, 0, matStone);
    addBox(15.65, 1.1, 22.8, sx * 14.855, G_SPRING, 0, matStoneLight);

    // Écoinçons extrudés de la Petite Voûte (z ∈ [-4.22, +4.22], y = 14.46 .. 18.72)
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

    // Intrados caissonné de la Petite Voûte (12 voussoirs radiaux)
    const pSegs = 12;
    for (let k = 0; k < pSegs; k++) {
      const aMid = ((k + 0.5) / pSegs) * Math.PI;
      const segArcW = (Math.PI * P_HALF) / pSegs + 0.06;
      const vy = P_SPRING + Math.sin(aMid) * (P_HALF - 0.06);
      const vz = Math.cos(aMid) * (P_HALF - 0.06);
      const vMesh = addBox(15.0, 0.2, segArcW, sx * 14.855, vy, vz, matVaultCoffer, { cast: false });
      vMesh.rotation.x = Math.PI * 0.5 - aMid;
    }

    // Archivolte extérieure Petite Voûte (faces Est/Ouest des côtés Nord/Sud de l'Arc)
    const sideArch = new THREE.Mesh(new THREE.TorusGeometry(P_HALF + 0.28, 0.34, 8, 22, Math.PI), matStoneLight);
    sideArch.rotation.y = Math.PI * 0.5;
    sideArch.position.set(sx * 22.42, P_SPRING, 0);
    archGroup.add(sideArch);
    addBox(0.95, 1.35, 1.15, sx * 22.58, pPeak + 0.25, 0, matStoneLight);
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

  // Intrados caissonné de la Grande Voûte (16 voussoirs radiaux sur toute la profondeur 22 m)
  const gSegs = 16;
  for (let k = 0; k < gSegs; k++) {
    const aMid = ((k + 0.5) / gSegs) * Math.PI;
    const segArcW = (Math.PI * G_HALF) / gSegs + 0.08;
    const vx = Math.cos(aMid) * (G_HALF - 0.08);
    const vy = G_SPRING + Math.sin(aMid) * (G_HALF - 0.08);
    const vMesh = addBox(segArcW, 0.22, 22.1, vx, vy, 0, matVaultCoffer, { cast: false });
    vMesh.rotation.z = aMid - Math.PI * 0.5;
  }

  // Archivoltes & Clés de voûte sculptées sur les façades Champs-Élysées (+Z) & Grande-Armée (-Z)
  [-11.14, 11.14].forEach((fz) => {
    const grandArch = new THREE.Mesh(new THREE.TorusGeometry(G_HALF + 0.42, 0.46, 8, 28, Math.PI), matStoneLight);
    grandArch.position.set(0, G_SPRING, fz);
    archGroup.add(grandArch);
    addBox(1.5, 2.2, 0.9, 0, gPeak + 0.45, fz + Math.sign(fz) * 0.28, matStoneLight);
    // Victoires ailées dans les écoinçons supérieurs de la Grande Voûte
    [-6.2, 6.2].forEach((vx) => {
      addBox(2.4, 3.4, 0.45, vx, gPeak + 1.1, fz + Math.sign(fz) * 0.12, matStoneLight);
    });
  });

  // C. Panneaux gravés des 660 Généraux & Batailles sous la Grande Voûte & Petites Voûtes
  [-1, 1].forEach((sx) => {
    [-7.66, 7.66].forEach((pz) => {
      addBox(0.14, 17.5, 6.4, sx * (G_HALF - 0.04), 12.2, pz, matEngraving, { cast: false });
    });
  });
  [-1, 1].forEach((sz) => {
    [-14.855, 14.855].forEach((px) => {
      addBox(14.2, 10.6, 0.14, px, 8.6, sz * (P_HALF - 0.04), matEngraving, { cast: false });
    });
  });

  // D. Les 4 Grands Hauts-Reliefs sculptés (y = 3,2 .. 15,8 m) + 6 Bas-Reliefs rectangulaires
  const reliefPlacements = [
    { px: +14.855, pz: +11.12, zSign: 1, key: 'marseillaise' }, // Pilier droit Champs-Élysées
    { px: -14.855, pz: +11.12, zSign: 1, key: 'triomphe' },     // Pilier gauche Champs-Élysées
    { px: -14.855, pz: -11.12, zSign: -1, key: 'resistance' },  // Pilier droit Grande-Armée
    { px: +14.855, pz: -11.12, zSign: -1, key: 'paix' },        // Pilier gauche Grande-Armée
  ];

  reliefPlacements.forEach(({ px, pz, zSign, key }) => {
    const baseZ = pz + zSign * 0.72;
    // Piédestal saillant du groupe sculpté
    addBox(6.8, 2.9, 1.85, px, 4.3, baseZ, matStoneLight);
    addBox(7.2, 0.45, 2.1, px, 5.85, baseZ, matStoneLight);
    // Dalle haut-relief sculptée
    addBox(6.4, 10.8, 0.55, px, 11.4, pz + zSign * 0.35, matReliefs[key]);
    // Masses sculpturales 3D saillantes accrochant les ombres solaires
    addBox(2.2, 5.4, 1.35, px - 1.1, 8.9, pz + zSign * 0.85, matStoneLight);
    addBox(2.4, 5.8, 1.45, px + 1.05, 9.2, pz + zSign * 0.9, matStoneLight);
    addBox(1.8, 3.6, 1.15, px, 12.6, pz + zSign * 0.95, matStoneLight);

    if (key === 'marseillaise') {
      // Grandes ailes déployées du Génie de la Liberté (Rude)
      [-1, 1].forEach((wingSide) => {
        const wing = addBox(3.4, 0.9, 0.48, px + wingSide * 1.9, 14.3, pz + zSign * 1.05, matStoneLight);
        wing.rotation.z = wingSide * -0.45;
      });
    }

    // Bas-relief rectangulaire encadré au-dessus de l'imposte (faces Est/Ouest)
    addBox(7.8, 3.7, 0.55, px, 18.2, pz + zSign * 0.2, matStoneLight);
    addBox(7.1, 3.0, 0.42, px, 18.2, pz + zSign * 0.4, matFrieze);
  });

  // 2 Grands Bas-Reliefs latéraux sur les façades Nord/Sud (au-dessus des Petites Voûtes)
  [-22.5, 22.5].forEach((fx) => {
    addBox(0.55, 4.4, 12.6, fx, 25.4, 0, matStoneLight);
    addBox(0.45, 3.6, 11.6, fx + Math.sign(fx) * 0.16, 25.4, 0, matFrieze);
  });

  // E. Entablement, Grande Frise sculptée, Corniche à modillons & Attique aux 30 Boucliers (y = 35,8 .. 49,5 m)
  // Architrave & Grande Frise périphérique
  addBox(45.8, 1.1, 23.2, 0, 36.2, 0, matStoneLight);
  addBox(45.6, 2.35, 23.0, 0, 37.9, 0, matFrieze);
  // Grande corniche saillante à denticules / modillons (y = 39,8 m)
  addBox(48.2, 1.25, 25.6, 0, 39.8, 0, matStoneLight);
  for (let mx = -23.0; mx <= 23.0; mx += 2.0) {
    addBox(0.65, 0.72, 24.4, mx, 39.15, 0, matStoneLight);
  }
  for (let mz = -11.4; mz <= 11.4; mz += 2.0) {
    addBox(47.0, 0.72, 0.65, 0, 39.15, mz, matStoneLight);
  }

  // Étage d'Attique (y = 40,4 .. 48,8 m) + 30 Boucliers sculptés (11 Est, 11 Ouest, 4 Nord, 4 Sud)
  addBox(44.8, 8.2, 22.2, 0, 44.5, 0, matStone);
  addBox(45.6, 0.65, 23.0, 0, 40.7, 0, matStoneLight);
  addBox(46.0, 0.9, 23.4, 0, 48.95, 0, matStoneLight);

  // 11 Boucliers Est (+Z) & 11 Boucliers Ouest (-Z)
  for (let s = 0; s < 11; s++) {
    const sx = -19.0 + s * 3.8;
    [-11.2, 11.2].forEach((sz) => {
      const shield = addCylinder(1.06, 1.06, 0.34, 18, sx, 44.6, sz, matStoneLight);
      shield.rotation.x = Math.PI * 0.5;
      const boss = addCylinder(0.28, 0.34, 0.22, 12, sx, 44.6, sz + Math.sign(sz) * 0.2, matGold);
      boss.rotation.x = Math.PI * 0.5;
      if (s < 10) {
        addBox(0.45, 7.6, 0.35, sx + 1.9, 44.6, sz, matStoneLight, { cast: false });
      }
    });
  }
  // 4 Boucliers Nord (-X) & 4 Boucliers Sud (+X)
  for (let s = 0; s < 4; s++) {
    const sz = -6.0 + s * 4.0;
    [-22.5, 22.5].forEach((sx) => {
      const shield = addCylinder(1.06, 1.06, 0.34, 18, sx, 44.6, sz, matStoneLight);
      shield.rotation.z = Math.PI * 0.5;
      const boss = addCylinder(0.28, 0.34, 0.22, 12, sx + Math.sign(sx) * 0.2, 44.6, sz, matGold);
      boss.rotation.z = Math.PI * 0.5;
      if (s < 3) {
        addBox(0.35, 7.6, 0.45, sx, 44.6, sz + 2.0, matStoneLight, { cast: false });
      }
    });
  }

  // F. Terrasse Panoramique visitable au sommet (y = 49,55 m -> 67,55 m absolu)
  addBox(43.2, 0.32, 20.6, 0, 49.4, 0, matSidewalkStone, { cast: false });
  // Balustrade périphérique ajourée (sécurité sans boucher la vue sur Paris)
  [-10.2, 10.2].forEach((bz) => {
    addBox(44.0, 0.56, 0.65, 0, 49.82, bz, matStoneLight);
    addBox(44.2, 0.16, 0.72, 0, 50.85, bz, matStoneLight, { cast: false });
    for (let bx = -21.2; bx <= 21.2; bx += 2.65) {
      addBox(0.38, 0.85, 0.42, bx, 50.42, bz, matStoneLight, { cast: false });
    }
  });
  [-21.7, 21.7].forEach((bx) => {
    addBox(0.65, 0.56, 21.0, bx, 49.82, 0, matStoneLight);
    addBox(0.72, 0.16, 21.2, bx, 50.85, 0, matStoneLight, { cast: false });
    for (let bz = -9.2; bz <= 9.2; bz += 2.3) {
      addBox(0.42, 0.85, 0.38, bx, 50.42, bz, matStoneLight, { cast: false });
    }
  });
  // Édicule central de sortie de l'escalier (284 marches)
  addBox(3.8, 2.3, 4.4, 0, 50.65, -4.8, matStone);
  addBox(4.2, 0.35, 4.8, 0, 51.9, -4.8, matStoneLight);
  // 4 Tables d'orientation panoramiques en bronze (Champs-Élysées, Grande-Armée, Tour Eiffel, Sacré-Cœur)
  [[0, 8.2, 0], [0, -8.2, Math.PI], [19.4, 0, Math.PI * 0.5], [-19.4, 0, -Math.PI * 0.5]].forEach(([tx, tz, ry]) => {
    const tbl = new THREE.Group();
    tbl.position.set(tx, 49.55, tz);
    tbl.rotation.y = ry;
    addBox(0.6, 1.05, 0.5, 0, 0.52, 0, matStoneLight, { parent: tbl });
    const plate = addBox(1.85, 0.12, 0.85, 0, 1.08, 0, matGold, { cast: false, parent: tbl });
    plate.rotation.x = 0.25;
    archGroup.add(tbl);
  });

  // G. Tombe du Soldat Inconnu & Bouclier-Brasier de la Flamme Éternelle ((0, 0, 0) sous la Grande Voûte)
  addBox(3.4, 0.14, 5.2, 0, 0.25, 0.2, matTombGranite, { cast: false });
  addBox(2.9, 0.04, 4.6, 0, 0.33, 0.2, matGold, { cast: false });
  addBox(2.65, 0.05, 4.35, 0, 0.34, 0.2, matTombGranite, { cast: false });
  // Socle circulaire du brasier aux glaives
  addCylinder(0.88, 1.08, 0.22, 16, 0, 0.42, -1.25, matBronzeDark);
  addCylinder(0.56, 0.72, 0.16, 12, 0, 0.56, -1.25, matGold, { cast: false });
  // 8 bornes-obus en bronze autour de la Dalle Sacrée
  [
    [-2.05, -2.5], [2.05, -2.5], [-2.05, 0.2], [2.05, 0.2],
    [-2.05, 2.9],  [2.05, 2.9],  [-0.95, 2.9], [0.95, 2.9],
  ].forEach(([bx, bz]) => {
    addCylinder(0.14, 0.18, 0.85, 8, bx, 0.62, bz, matBronzeDark);
  });
  addLocalCircleCollider(0, 0.2, 2.7);

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
   * 2. PLACE CHARLES-DE-GAULLE : ÉTOILE DE PAVÉS, ROND-POINT & 12 HÔTELS DES MARÉCHAUX
   * ==========================================================================
   */
  // A. Parvis central bicolore à 12 branches (r = 45,5 m)
  const parvisMesh = new THREE.Mesh(new THREE.CylinderGeometry(45.5, 45.8, 0.18, 48), matStarPavement);
  parvisMesh.position.set(0, 0.17, 0);
  parvisMesh.receiveShadow = true;
  envGroup.add(parvisMesh);

  // Couronne de bornes en granit autour du terre-plein central (r = 44,5 m)
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    addCylinder(0.16, 0.2, 0.95, 6, Math.cos(a) * 44.4, 0.65, Math.sin(a) * 44.4, matGranitePlinth, { parent: envGroup });
  }

  // B. Chaussée pavée du Rond-Point de l'Étoile (r = 45,5 .. 84 m) avec UVs polaires concentriques sans couture
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

  // C. Deux trémies d'accès du Passage du Souvenir (Champs-Élysées +36 et Grande-Armée -36)
  [-36, 36].forEach((tz) => {
    const sgn = Math.sign(tz);
    addBox(3.6, 0.85, 7.6, 0, 0.55, tz, matGranitePlinth, { parent: envGroup });
    addBox(2.6, 0.18, 6.2, 0, 0.22, tz, matTombGranite, { cast: false, parent: envGroup });
    addBox(3.8, 0.95, 0.22, 0, 0.65, tz + sgn * 3.8, matBronzeDark, { parent: envGroup });
  });

  // D. Les 12 Hôtels des Maréchaux (Hittorff, 1854) dans les 12 secteurs réguliers (entre les 12 avenues à 30°)
  const lampPositions = [];
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

    // Chaque Hôtel s'inscrit exactement à r = 109 m dans son secteur de 30° avec marge libre des avenues
    const hotelR = 110;
    const hotelW = k === 0 || k === 11 ? 20.5 : k === 4 || k === 5 ? 21.5 : 26.5;
    const hotelD = 18.0;
    const hotelH = 19.5; // Gabarit impérial uniforme imposé en 1854

    const hg = new THREE.Group();
    hg.position.set(inX * hotelR, 0, inZ * hotelR);
    hg.rotation.y = Math.PI - midTheta;
    envGroup.add(hg);

    // Trottoir sectoriel propre sous l'Hôtel (y = 0,04 -> sous la chaussée des avenues à 0,16)
    addBox(hotelW + 5.5, 0.14, hotelD + 12, 0, 0.04, 2.0, matSidewalkStone, { cast: false, parent: hg });
    // Corps néoclassique Hittorff + toiture mansardée d'ardoise + souches de cheminées
    addBox(hotelW, hotelH, hotelD, 0, hotelH * 0.5 + 0.08, 0, matMarechaux, { parent: hg });
    addBox(hotelW + 0.6, 0.55, hotelD + 0.6, 0, hotelH + 0.3, 0, matStoneLight, { cast: false, parent: hg });
    addBox(hotelW - 1.2, 3.8, hotelD - 1.2, 0, hotelH + 2.35, 0, matSlateRoof, { parent: hg });
    [-hotelW * 0.3, 0, hotelW * 0.3].forEach((cx) => {
      addBox(1.5, 1.9, 1.2, cx, hotelH + 4.8, 0, matStone, { cast: false, parent: hg });
    });

    // Candélabre sur le trottoir du rond-point devant chaque Hôtel des Maréchaux
    const lampR = 86.2;
    lampPositions.push([inX * lampR - tanX * 3.5, 0.12, inZ * lampR - tanZ * 3.5]);
    lampPositions.push([inX * lampR + tanX * 3.5, 0.12, inZ * lampR + tanZ * 3.5]);
  }

  // E. Candélabres parisiens instanciés (2 draw calls)
  const polesInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.11, 0.19, 4.6, 7), matLampPost, lampPositions.length);
  const globesInst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.42, 10, 8), matLampGlow, lampPositions.length);
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
  polesInst.instanceMatrix.needsUpdate = true;
  globesInst.instanceMatrix.needsUpdate = true;
  envGroup.add(polesInst, globesInst);

  // Fusion haute performance par matériau (~15 draw calls pour tout l'Arc & Place de l'Étoile !)
  mergeStaticGroupByMaterial(archGroup);
  mergeStaticGroupByMaterial(envGroup);

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

  function setLodLevel(level) {
    currentLod = level;
    // L'Arc et sa place restent visibles à toute distance dans la skyline ; seules les flammes & micro-détails se réduisent au loin
    flameGroup.visible = level < 2;
    polesInst.visible = level === 0;
    globesInst.visible = level === 0;
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
    } else {
      flameLight.visible = false;
    }

    // 2. Illumination nocturne dorée de l'Arc de Triomphe & des candélabres de l'Étoile
    const glow = Math.max(0, (nightFactor - 0.26) / 0.74);
    nightLitStoneMats.forEach((mat) => {
      mat.emissive.setHex(0xd49a4c);
      mat.emissiveIntensity = glow * 0.38;
    });
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
