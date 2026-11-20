import * as THREE from 'three';
import { mergeStaticGroupByMaterial } from '../perf-manager.js';

/**
 * ============================================================================
 * MONUMENT COMPLET #2 : LA TOUR EIFFEL — HAUTE FIDÉLITÉ ARCHITECTURALE (330 m)
 * Position GPS : 48.8584° N, 2.2945° E -> (-3694, 0, +556)
 * Orientée exactement dans l'axe Trocadéro / Pont d'Iéna -> Champ-de-Mars
 *
 * Modélisation muséale 100 % 3D (< 55 draw calls en LOD 0) :
 *  - Ossature 100 % treillis 3D en fer puddlé riveté (~5 500 poutres InstancedMesh
 *    sur les 3 nuances historiques « Brun-Or Tour Eiffel », zéro panneau plat alpha)
 *  - 4 grands arcs semi-circulaires 3D épousant l'inclinaison exacte des piliers,
 *    doubles membrures, tympans ajourés & rosaces en fer forgé
 *  - 16 massifs de fondation en pierre de taille inclinés + sabots d'ancrage rivetés
 *    + Buste doré de Gustave Eiffel (Bourdelle) + 4 pavillons d'accueil Beaux-Arts
 *  - 1er étage (57,6 m) : consoles, 56 arcades ajourées 3D, frise dorée intégrale des
 *    72 vrais savants (18 noms distincts par face !), plancher de verre, 3 pavillons vitrés
 *  - 2e étage (115,7 m) : double plateau, 40 arcades périmétriques & Le Jules Verne
 *  - Galerie technique (196 m), chapiteau évasé (264–276 m), bureau de Gustave Eiffel,
 *    Campanile Beaux-Arts, phare marin Fresnel rotatif & mât treillis TNT à 330,0 m
 *  - 3 ascenseurs inclinés à impériale + 2 verticaux + scintillement étoilé 2 200 éclats
 *  - Parvis (mur de verre, Carrousel de la Tour Eiffel, bassins romantiques),
 *    Champ-de-Mars, École Militaire, Pont d'Iéna (Aigles & Cavaliers) & Trocadéro/Chaillot
 * ============================================================================
 */

const EIFFEL_WORLD_POS = new THREE.Vector3(-3694, 0, 556);
// Axe -Z local pointe vers le Pont d'Iéna (-136, -141) -> rotY = atan2(136, 141)
const EIFFEL_ROT_Y = Math.atan2(136, 141);

// Les 72 vrais savants gravés par Gustave Eiffel (18 noms distincts sur chacune des 4 faces !)
const SCHOLARS_BY_FACE = [
  // Face Nord-Ouest (Trocadéro)
  ['SEGUIN', 'LALANDE', 'TRESCA', 'PONCELET', 'BRESSE', 'LAGRANGE', 'BELANGER', 'CUVIER', 'LAPLACE',
   'DULONG', 'CHASLES', 'LAVOISIER', 'AMPÈRE', 'CHEVREUL', 'FLACHAT', 'NAVIER', 'LEGENDRE', 'CHAPTAL'],
  // Face Sud-Ouest (Grenelle)
  ['JAMIN', 'GAY-LUSSAC', 'FIZEAU', 'SCHNEIDER', 'LE CHATELIER', 'BERTHIER', 'BARRAL', 'DE DION', 'GOUIN',
   'JOUSSELIN', 'BROCA', 'BECQUEREL', 'CORIOLIS', 'CAIL', 'TRIGER', 'GIFFARD', 'PERRIER', 'STURM'],
  // Face Sud-Est (École Militaire)
  ['CAUCHY', 'BELGRAND', 'REGNAULT', 'FRESNEL', 'DE PRONY', 'VICAT', 'EBELMEN', 'COULOMB', 'POINSOT',
   'FOUCAULT', 'DELAUNAY', 'MORIN', 'HAÜY', 'COMBES', 'THÉNARD', 'ARAGO', 'POISSON', 'MONGE'],
  // Face Nord-Est (La Bourdonnais)
  ['PETIET', 'DAGUERRE', 'WURTZ', 'LE VERRIER', 'PERDONNET', 'DELAMBRE', 'MALUS', 'BREGUET', 'POLONCEAU',
   'DUMAS', 'CLAPEYRON', 'BORDA', 'FOURIER', 'BICHAT', 'SAUVAGE', 'PELOUZE', 'CARNOT', 'LAMÉ'],
];

function createRivetedIronTexture(baseHex, midHex, rivetLightHex, rivetDarkHex) {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  // Subtle metallic longitudinal grain & bolted plate joints
  for (let y = 0; y < size; y += 64) {
    ctx.fillStyle = midHex;
    ctx.fillRect(0, y, size, 32);
    ctx.fillStyle = rivetDarkHex;
    ctx.fillRect(0, y, size, 3);
    ctx.fillStyle = rivetLightHex;
    ctx.fillRect(0, y + 3, size, 2);
  }
  for (let i = 0; i < 900; i++) {
    const x = (i * 137) % size;
    const y = (i * 293) % size;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,235,205,0.06)' : 'rgba(20,14,10,0.08)';
    ctx.fillRect(x, y, 2, 10);
  }

  // Double rows of forged rivets along beam flanges
  for (let y = 10; y < size; y += 22) {
    [18, 42, size - 42, size - 18].forEach((rx) => {
      ctx.fillStyle = rivetDarkHex;
      ctx.beginPath();
      ctx.arc(rx + 1.5, y + 1.5, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rivetLightHex;
      ctx.beginPath();
      ctx.arc(rx, y, 3.6, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function create72ScholarsAtlasTexture() {
  const w = 2048;
  const h = 512; // 4 bandes de 128 px -> les 72 noms réels en 1 seul draw call !
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  SCHOLARS_BY_FACE.forEach((names, row) => {
    const y0 = row * 128;
    const grad = ctx.createLinearGradient(0, y0, 0, y0 + 128);
    grad.addColorStop(0, '#624b3a');
    grad.addColorStop(0.5, '#7a5f49');
    grad.addColorStop(1, '#584232');
    ctx.fillStyle = grad;
    ctx.fillRect(0, y0, w, 128);

    // Double filet doré supérieur & inférieur + cartouches
    ctx.fillStyle = '#f0c665';
    ctx.fillRect(0, y0 + 6, w, 7);
    ctx.fillRect(0, y0 + 115, w, 7);
    ctx.strokeStyle = 'rgba(248, 212, 122, 0.65)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(4, y0 + 17, w - 8, 94);

    const step = w / names.length;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    names.forEach((name, idx) => {
      const cx = step * (idx + 0.5);
      // Séparateur rosette riveté entre chaque savant
      if (idx > 0) {
        ctx.fillStyle = '#dfb252';
        ctx.beginPath();
        ctx.arc(step * idx, y0 + 64, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.font = name.length > 9 ? 'bold 20px Georgia, serif' : 'bold 23px Georgia, serif';
      ctx.fillStyle = 'rgba(28, 18, 10, 0.78)';
      ctx.fillText(name, cx + 1.8, y0 + 66.8);
      ctx.fillStyle = '#ffe69a';
      ctx.fillText(name, cx, y0 + 64.5);
    });
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createRusticatedStoneTexture() {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#dfd4bf';
  ctx.fillRect(0, 0, size, size);

  const rows = 8;
  const rh = size / rows;
  for (let r = 0; r < rows; r++) {
    const y = r * rh;
    const offset = (r % 2) * 32;
    for (let x = -32; x < size; x += 64) {
      const shade = ((r * 23 + x * 11) % 14) - 7;
      ctx.fillStyle = `rgb(${222 + shade}, ${211 + shade}, ${190 + shade})`;
      ctx.fillRect(x + offset + 2, y + 2, 60, rh - 4);
    }
    ctx.fillStyle = 'rgba(72, 62, 50, 0.24)';
    ctx.fillRect(0, y, size, 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createCarouselCanopyTexture() {
  const w = 512;
  const h = 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  const stripes = 16;
  const sw = w / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#9c2424' : '#f4ead6';
    ctx.fillRect(i * sw, 0, sw, h);
  }
  ctx.fillStyle = '#e4b855';
  ctx.fillRect(0, h - 18, w, 10);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createNaturalGrassTexture() {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#486e37';
  ctx.fillRect(0, 0, size, size);

  // Bandes douces de tonte à la française
  for (let x = 0; x < size; x += 64) {
    ctx.fillStyle = (x / 64) % 2 === 0 ? 'rgba(92, 134, 62, 0.14)' : 'rgba(42, 68, 30, 0.10)';
    ctx.fillRect(x, 0, 64, size);
  }
  for (let i = 0; i < 6500; i++) {
    const x = (i * 173) % size;
    const y = (i * 311 + Math.floor(i / 40) * 7) % size;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(130, 165, 82, 0.16)' : 'rgba(34, 54, 24, 0.15)';
    ctx.fillRect(x, y, 2, 3);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 12);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createGravelPathTexture() {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#d3c7b0';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 3200; i++) {
    const x = (i * 199) % size;
    const y = (i * 107) % size;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,252,244,0.18)' : 'rgba(130,118,98,0.16)';
    ctx.fillRect(x, y, 2, 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 42);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createAvenueAsphaltTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#36393f';
  ctx.fillRect(0, 0, 256, 512);

  // Bordures pierre claires
  ctx.fillStyle = '#b4aca0';
  ctx.fillRect(0, 0, 12, 512);
  ctx.fillRect(244, 0, 12, 512);

  // Ligne axiale discontinue
  ctx.fillStyle = 'rgba(240, 238, 230, 0.78)';
  for (let y = 18; y < 512; y += 64) {
    ctx.fillRect(125, y, 6, 30);
  }

  for (let i = 0; i < 1800; i++) {
    const x = (i * 151) % 256;
    const y = (i * 271) % 512;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(x, y, 2, 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createHaussmannFacadeTexture(stoneHex = '#dfd4c1', awningHex = '#5f2523') {
  const w = 512;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  ctx.fillStyle = stoneHex;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(85, 75, 62, 0.14)';
  for (let y = 0; y < h; y += 22) {
    ctx.fillRect(0, y, w, 1.5);
  }

  ctx.fillStyle = '#3b332b';
  ctx.fillRect(0, h - 98, w, 98);
  for (let col = 0; col < 5; col++) {
    const bx = 18 + col * 98;
    ctx.fillStyle = '#202b36';
    ctx.fillRect(bx, h - 84, 74, 76);
    ctx.fillStyle = 'rgba(240, 212, 150, 0.25)';
    ctx.fillRect(bx + 6, h - 78, 62, 34);
  }
  ctx.fillStyle = awningHex;
  ctx.fillRect(0, h - 102, w, 14);

  const floorYs = [312, 232, 152, 72];
  floorYs.forEach((fy, idx) => {
    ctx.fillStyle = '#cfc3ae';
    ctx.fillRect(0, fy + 64, w, 6);

    for (let col = 0; col < 7; col++) {
      const wx = 20 + col * 70;
      ctx.fillStyle = '#ebe3d3';
      ctx.fillRect(wx - 4, fy + 6, 40, 56);
      ctx.fillStyle = '#263442';
      ctx.fillRect(wx, fy + 10, 32, 48);
      ctx.fillStyle = '#e7dfd2';
      ctx.fillRect(wx + 15, fy + 10, 2, 48);
      ctx.fillRect(wx, fy + 26, 32, 2);
      if (idx === 0 || idx === 3) {
        ctx.fillStyle = '#26292e';
        ctx.fillRect(0, fy + 50, w, 9);
      } else {
        ctx.fillStyle = '#2b2e33';
        ctx.fillRect(wx - 2, fy + 48, 36, 9);
      }
    }
  });

  ctx.fillStyle = '#4e5863';
  ctx.fillRect(0, 0, w, 66);
  for (let col = 0; col < 7; col++) {
    const wx = 24 + col * 70;
    ctx.fillStyle = '#25313e';
    ctx.fillRect(wx, 18, 24, 34);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createChaillotFacadeTexture() {
  const w = 512;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#ede5d6';
  ctx.fillRect(0, 0, w, h);

  for (let col = 0; col < 8; col++) {
    const x = 16 + col * 62;
    ctx.fillStyle = '#3b4a59';
    ctx.fillRect(x, 68, 34, 365);
    ctx.fillStyle = '#ded4c2';
    ctx.fillRect(x + 34, 42, 28, 430);
    ctx.fillStyle = '#d4ccb9';
    ctx.fillRect(x + 15, 68, 4, 365);
    ctx.fillRect(x, 195, 34, 8);
    ctx.fillRect(x, 315, 34, 8);
  }
  ctx.fillStyle = '#f3ece0';
  ctx.fillRect(0, 0, w, 62);
  ctx.fillStyle = '#caa24e';
  ctx.fillRect(0, 52, w, 8);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// Profil exponentiel historique de Koechlin & Nouguier (base exacte 125 m × 125 m, sommet 276 m)
const PROFILE_KEYS = [
  { y: 0.0,   centerSpan: 49.5, legHalf: 13.0 },
  { y: 14.0,  centerSpan: 43.2, legHalf: 11.2 },
  { y: 28.0,  centerSpan: 37.5, legHalf: 9.5 },
  { y: 43.0,  centerSpan: 32.3, legHalf: 8.0 },
  { y: 57.6,  centerSpan: 28.0, legHalf: 6.9 },
  { y: 72.0,  centerSpan: 24.1, legHalf: 5.9 },
  { y: 87.0,  centerSpan: 20.5, legHalf: 5.0 },
  { y: 101.0, centerSpan: 17.5, legHalf: 4.3 },
  { y: 115.7, centerSpan: 14.8, legHalf: 3.6 },
  { y: 135.0, centerSpan: 11.6, legHalf: 2.8 },
  { y: 158.0, centerSpan: 8.9,  legHalf: 2.15 },
  { y: 186.0, centerSpan: 7.0,  legHalf: 1.75 },
  { y: 216.0, centerSpan: 5.8,  legHalf: 1.50 },
  { y: 246.0, centerSpan: 5.0,  legHalf: 1.35 },
  { y: 266.0, centerSpan: 4.65, legHalf: 1.25 },
  { y: 276.0, centerSpan: 5.2,  legHalf: 1.25 },
];

function sampleTowerProfile(y) {
  if (y <= PROFILE_KEYS[0].y) return PROFILE_KEYS[0];
  const last = PROFILE_KEYS[PROFILE_KEYS.length - 1];
  if (y >= last.y) return last;

  for (let i = 0; i < PROFILE_KEYS.length - 1; i++) {
    const a = PROFILE_KEYS[i];
    const b = PROFILE_KEYS[i + 1];
    if (y >= a.y && y <= b.y) {
      const t = (y - a.y) / (b.y - a.y);
      return {
        centerSpan: THREE.MathUtils.lerp(a.centerSpan, b.centerSpan, t),
        legHalf: THREE.MathUtils.lerp(a.legHalf, b.legHalf, t),
      };
    }
  }
  return last;
}

export function buildTourEiffelMonument(scene) {
  const root = new THREE.Group();
  root.name = 'TourEiffelMonument';
  root.position.copy(EIFFEL_WORLD_POS);
  root.rotation.y = EIFFEL_ROT_Y;
  scene.add(root);
  root.updateMatrixWorld(true);

  const colliders = [];
  const circleColliders = [];

  function localToWorld(lx, ly, lz) {
    return new THREE.Vector3(lx, ly, lz).applyMatrix4(root.matrixWorld);
  }

  function registerLocalCircleCollider(lx, lz, r) {
    const w = localToWorld(lx, 0, lz);
    circleColliders.push({ x: w.x, z: w.z, r });
  }

  // --- MATÉRIAUX PUDDLÉS « BRUN-OR TOUR EIFFEL » (3 NUANCES GRADUÉES + RIVETS) ---
  // Métallique équilibré (0.24..0.28) pour garder un bronze chaud lumineux même à l'ombre sans IBL !
  const matIronBase = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: createRivetedIronTexture('#886950', '#795c45', '#a8876b', '#523c2c'),
    roughness: 0.54,
    metalness: 0.28,
    emissive: new THREE.Color(0x000000),
  });
  const matIronMid = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: createRivetedIronTexture('#9b7a5e', '#8c6d53', '#bc9a7b', '#614835'),
    roughness: 0.50,
    metalness: 0.26,
    emissive: new THREE.Color(0x000000),
  });
  const matIronTop = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: createRivetedIronTexture('#b08f70', '#a08063', '#cfaea0', '#725742'),
    roughness: 0.48,
    metalness: 0.24,
    emissive: new THREE.Color(0x000000),
  });
  const matIronDark = new THREE.MeshStandardMaterial({
    color: 0x5c4635,
    roughness: 0.54,
    metalness: 0.34,
    emissive: new THREE.Color(0x000000),
  });
  const ironMaterials = [matIronBase, matIronMid, matIronTop];

  const mat72Scholars = new THREE.MeshStandardMaterial({
    map: create72ScholarsAtlasTexture(),
    roughness: 0.46,
    metalness: 0.18,
    emissive: new THREE.Color(0x52391a),
    emissiveIntensity: 0.22,
  });
  const matRusticatedStone = new THREE.MeshStandardMaterial({
    map: createRusticatedStoneTexture(),
    roughness: 0.82,
  });

  const matDeck = new THREE.MeshStandardMaterial({ color: 0x564c44, roughness: 0.78 });
  const matGlassFloor = new THREE.MeshStandardMaterial({
    color: 0xaad8ef,
    roughness: 0.10,
    metalness: 0.32,
    transparent: true,
    opacity: 0.40,
    side: THREE.DoubleSide,
  });
  const matPavilion = new THREE.MeshStandardMaterial({ color: 0x863628, roughness: 0.54, metalness: 0.28 });
  const matGlassWindow = new THREE.MeshStandardMaterial({
    color: 0x9ec9e0,
    roughness: 0.14,
    metalness: 0.58,
    transparent: true,
    opacity: 0.66,
  });
  const matWarmInterior = new THREE.MeshStandardMaterial({
    color: 0xfff0cc,
    emissive: new THREE.Color(0xffbd59),
    emissiveIntensity: 0.32,
    roughness: 0.35,
  });
  const matGold = new THREE.MeshStandardMaterial({ color: 0xe6b852, roughness: 0.24, metalness: 0.86 });
  const matStone = new THREE.MeshStandardMaterial({ color: 0xded4c0, roughness: 0.84 });
  const matStoneLight = new THREE.MeshStandardMaterial({ color: 0xede6d8, roughness: 0.78 });
  const matGranite = new THREE.MeshStandardMaterial({ color: 0xc2bbb0, roughness: 0.88 });
  const matWater = new THREE.MeshStandardMaterial({
    color: 0x2c5c72,
    roughness: 0.12,
    metalness: 0.65,
    transparent: true,
    opacity: 0.86,
  });
  const matSecurityGlass = new THREE.MeshStandardMaterial({
    color: 0xcbe8f5,
    roughness: 0.08,
    metalness: 0.2,
    transparent: true,
    opacity: 0.32,
    side: THREE.DoubleSide,
  });
  const matBeaconLens = new THREE.MeshStandardMaterial({
    color: 0xfff9e2,
    emissive: new THREE.Color(0xffe08a),
    emissiveIntensity: 0.45,
    roughness: 0.12,
  });
  const matAviationRed = new THREE.MeshStandardMaterial({
    color: 0xff3b2f,
    emissive: new THREE.Color(0xff2a1e),
    emissiveIntensity: 0.85,
    roughness: 0.25,
  });
  const matMastWhite = new THREE.MeshStandardMaterial({ color: 0xebe8e0, roughness: 0.48, metalness: 0.35 });
  const matCarouselCanopy = new THREE.MeshStandardMaterial({ map: createCarouselCanopyTexture(), roughness: 0.65 });

  // Matériaux détaillés des ascenseurs (acier, verre panoramique, laiton & éclairage intérieur)
  const matElevRail = new THREE.MeshStandardMaterial({ color: 0x2f2925, roughness: 0.42, metalness: 0.78 });
  const matElevFrame = new THREE.MeshStandardMaterial({ color: 0x46362b, roughness: 0.45, metalness: 0.65 });
  const matElevAccent = new THREE.MeshStandardMaterial({ color: 0x8b3828, roughness: 0.46, metalness: 0.35 });
  const matElevGlass = new THREE.MeshStandardMaterial({
    color: 0xc2e6fa,
    roughness: 0.08,
    metalness: 0.25,
    transparent: true,
    opacity: 0.44,
    side: THREE.DoubleSide,
  });
  const matElevInteriorGlow = new THREE.MeshStandardMaterial({
    color: 0xfff3d4,
    emissive: new THREE.Color(0xffc86b),
    emissiveIntensity: 0.55,
    roughness: 0.3,
  });
  const matElevCable = new THREE.MeshStandardMaterial({ color: 0x767d85, roughness: 0.35, metalness: 0.85 });

  function addBox(w, h, d, x, y, z, mat, { cast = true, receive = true, parent = root } = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = cast;
    m.receiveShadow = receive;
    parent.add(m);
    return m;
  }

  // Groupe unique de tous les éléments statiques de la Tour (fusionné en ~11 draw calls au total !)
  const towerStaticShell = new THREE.Group();
  towerStaticShell.name = 'TourEiffelStaticShell';
  root.add(towerStaticShell);

  /**
   * ==========================================================================
   * 1. STRUCTURE 100 % TREILLIS 3D EN FER PUDDLÉ (ARBALÉTRIERS, CROISILLONS,
   *    4 GRANDS ARCS INCLINÉS, CONSOLES, ESCALIER SUD & MÂT TNT 330 M)
   *    Instanciée en 3 draw calls (Base / Milieu / Sommet) + 1 draw call Rosaces/Arcades !
   * ==========================================================================
   */
  const beams = [];
  const filigreeArcs = []; // Demi-anneaux & rosaces en fer forgé 3D (InstancedMesh = 1 draw call)
  const upVec = new THREE.Vector3(0, 1, 0);
  const tmpDir = new THREE.Vector3();
  const tmpQuat = new THREE.Quaternion();
  const tmpEuler = new THREE.Euler();

  function queueBeam(p0, p1, thickness = 0.72, tier = 0, depthThick = null) {
    const len = p0.distanceTo(p1);
    if (len < 0.06) return;
    const mid = p0.clone().add(p1).multiplyScalar(0.5);
    tmpDir.subVectors(p1, p0).normalize();
    tmpQuat.setFromUnitVectors(upVec, tmpDir);
    beams.push({
      pos: mid,
      quat: tmpQuat.clone(),
      sx: thickness,
      sy: len,
      sz: depthThick ?? thickness,
      tier,
    });
  }

  function queueFiligreeArc(x, y, z, rx, ry, rz, scaleX, scaleY, scaleZ) {
    tmpEuler.set(rx, ry, rz, 'YXZ');
    filigreeArcs.push({
      pos: new THREE.Vector3(x, y, z),
      quat: new THREE.Quaternion().setFromEuler(tmpEuler),
      scale: new THREE.Vector3(scaleX, scaleY, scaleZ),
    });
  }

  const legSigns = [
    [-1, -1], // Pilier Nord
    [1, -1],  // Pilier Est
    [1, 1],   // Pilier Sud
    [-1, 1],  // Pilier Ouest
  ];

  function getCornerPoints(y, sx, sz) {
    const prof = sampleTowerProfile(y);
    const cx = sx * prof.centerSpan;
    const cz = sz * prof.centerSpan;
    const h = prof.legHalf;
    return [
      new THREE.Vector3(cx - h, y, cz - h),
      new THREE.Vector3(cx + h, y, cz - h),
      new THREE.Vector3(cx + h, y, cz + h),
      new THREE.Vector3(cx - h, y, cz + h),
    ];
  }

  // --- A. LES 4 GRANDS PILIERS EN TREILLIS 3D FIN (24 TRAVÉES PAR PILIER, 0 -> 115,7 m) ---
  const lowerLevels = [];
  for (let i = 0; i <= 12; i++) lowerLevels.push((i / 12) * 57.6);
  for (let i = 1; i <= 12; i++) lowerLevels.push(57.6 + (i / 12) * (115.7 - 57.6));

  legSigns.forEach(([sx, sz]) => {
    for (let i = 0; i < lowerLevels.length - 1; i++) {
      const y0 = lowerLevels[i];
      const y1 = lowerLevels[i + 1];
      const tier = y0 < 57.5 ? 0 : 1;
      const tNorm = y0 / 115.7;
      const chordThick = THREE.MathUtils.lerp(1.32, 0.84, tNorm);
      const braceThick = THREE.MathUtils.lerp(0.44, 0.30, tNorm);
      const c0 = getCornerPoints(y0, sx, sz);
      const c1 = getCornerPoints(y1, sx, sz);

      // 4 arbalétriers principaux + traverses horizontales + double croisillon en X (dentelle de fer !)
      for (let k = 0; k < 4; k++) {
        const nextK = (k + 1) % 4;
        queueBeam(c0[k], c1[k], chordThick, tier);
        queueBeam(c1[k], c1[nextK], chordThick * 0.56, tier);

        if (y0 < 57.5) {
          // Sous le 1er étage (faces larges de 14 à 26 m) : division en 2 panneaux en X côte à côte !
          const m0 = c0[k].clone().lerp(c0[nextK], 0.5);
          const m1 = c1[k].clone().lerp(c1[nextK], 0.5);
          queueBeam(m0, m1, braceThick * 0.95, tier);
          queueBeam(c0[k], m1, braceThick * 0.82, tier);
          queueBeam(m0, c1[k], braceThick * 0.82, tier);
          queueBeam(m0, c1[nextK], braceThick * 0.82, tier);
          queueBeam(c0[nextK], m1, braceThick * 0.82, tier);
        } else {
          // Entre le 1er et le 2e étage : double croix de Saint-André serrée + losange intermédiaire
          queueBeam(c0[k], c1[nextK], braceThick, tier);
          queueBeam(c0[nextK], c1[k], braceThick, tier);
        }
      }

      // Diaphragmes internes croisés tous les 2 étages (rigidité visuelle vue d'en bas !)
      if (i % 2 === 1) {
        queueBeam(c1[0], c1[2], braceThick * 0.78, tier);
        queueBeam(c1[1], c1[3], braceThick * 0.78, tier);
      }
    }
  });

  // Escalier métallique historique en zig-zag visible à l'intérieur du Pilier Sud (+1, +1)
  for (let i = 0; i < lowerLevels.length - 1; i++) {
    const y0 = lowerLevels[i];
    const y1 = lowerLevels[i + 1];
    const p0 = sampleTowerProfile(y0);
    const p1 = sampleTowerProfile(y1);
    const side = i % 2 === 0 ? 1 : -1;
    const off0 = p0.legHalf * 0.38 * side;
    const off1 = -p1.legHalf * 0.38 * side;
    const sA = new THREE.Vector3(p0.centerSpan + off0, y0, p0.centerSpan - off0);
    const sB = new THREE.Vector3(p1.centerSpan + off1, y1, p1.centerSpan - off1);
    queueBeam(sA, sB, 0.52, y0 < 57.5 ? 0 : 1, 1.45);
  }

  // --- B. LES 4 GRANDS ARCS SEMI-CIRCULAIRES 3D INCLINÉS SOUS LE 1ER ÉTAGE (ZÉRO PNG PLAT !) ---
  // Chaque arc épouse exactement la pente extérieure des piliers (dFront(y) = centerSpan + legHalf)
  // avec double membrure intrados/extrados, profondeur 4,2 m, entretoises radiales, tympan treillis & rosaces !
  const archTopY = 53.6;
  const archCenterY = 12.6;
  const archRIn = 32.0;
  const archROut = 36.2;
  const archDepth = 4.2;
  const archSegs = 22;

  function makeFacePt(faceIdx, s, y, depthOff = 0) {
    const prof = sampleTowerProfile(y);
    const d = prof.centerSpan + prof.legHalf - 0.55 - depthOff;
    if (faceIdx === 0) return new THREE.Vector3(s, y, -d);  // Face Nord-Ouest (Trocadéro)
    if (faceIdx === 1) return new THREE.Vector3(s, y, +d);  // Face Sud-Est (Champ-de-Mars)
    if (faceIdx === 2) return new THREE.Vector3(+d, y, s);  // Face Nord-Est (Bourdonnais)
    return new THREE.Vector3(-d, y, s);                     // Face Sud-Ouest (Grenelle)
  }

  for (let faceIdx = 0; faceIdx < 4; faceIdx++) {
    // Avec Euler YXZ et rx > 0, le local +Z (haut penché vers +Z) doit pointer vers l'INTÉRIEUR de la tour
    const faceRotY = faceIdx === 0 ? 0 : faceIdx === 1 ? Math.PI : faceIdx === 2 ? -Math.PI * 0.5 : Math.PI * 0.5;
    const frontIn = [];
    const frontOut = [];
    const backIn = [];
    const backOut = [];

    for (let k = 0; k <= archSegs; k++) {
      const a = THREE.MathUtils.lerp(Math.PI * 0.04, Math.PI * 0.96, k / archSegs);
      const sIn = -Math.cos(a) * archRIn;
      const yIn = archCenterY + Math.sin(a) * archRIn;
      const sOut = -Math.cos(a) * archROut;
      const yOut = Math.min(archTopY - 0.8, archCenterY + Math.sin(a) * archROut);

      frontIn.push(makeFacePt(faceIdx, sIn, yIn, 0));
      frontOut.push(makeFacePt(faceIdx, sOut, yOut, 0));
      backIn.push(makeFacePt(faceIdx, sIn, yIn, archDepth));
      backOut.push(makeFacePt(faceIdx, sOut, yOut, archDepth));
    }

    // Grande poutre-ceinture horizontale inférieure (y = 53,6 m) reliant les 2 piliers
    const beltSpan = sampleTowerProfile(archTopY).centerSpan + sampleTowerProfile(archTopY).legHalf;
    queueBeam(makeFacePt(faceIdx, -beltSpan, archTopY, 0), makeFacePt(faceIdx, beltSpan, archTopY, 0), 1.35, 0);
    queueBeam(makeFacePt(faceIdx, -beltSpan, archTopY, archDepth), makeFacePt(faceIdx, beltSpan, archTopY, archDepth), 1.15, 0);

    for (let k = 0; k < archSegs; k++) {
      // Membrures courbes avant & arrière (intrados épais + extrados)
      queueBeam(frontIn[k], frontIn[k + 1], 0.96, 0);
      queueBeam(frontOut[k], frontOut[k + 1], 0.78, 0);
      queueBeam(backIn[k], backIn[k + 1], 0.86, 0);
      queueBeam(backOut[k], backOut[k + 1], 0.70, 0);

      // Entretoises radiales & croisillons en X dans l'anneau courbe de l'arc
      queueBeam(frontIn[k], frontOut[k], 0.44, 0);
      queueBeam(backIn[k], backOut[k], 0.40, 0);
      queueBeam(frontIn[k], frontOut[k + 1], 0.34, 0);
      queueBeam(frontOut[k], frontIn[k + 1], 0.34, 0);
      queueBeam(backIn[k], backOut[k + 1], 0.32, 0);
      queueBeam(backOut[k], backIn[k + 1], 0.32, 0);

      // Entretoises transversales avant <-> arrière (vraie épaisseur 3D vue d'en dessous !)
      queueBeam(frontIn[k], backIn[k], 0.42, 0);
      queueBeam(frontOut[k], backOut[k], 0.38, 0);
      if (k % 2 === 0) {
        queueBeam(frontIn[k], backIn[k + 1], 0.28, 0);
      }

      // Rosace décorative circulaire complète (2 demi-anneaux dos-à-dos dans le même InstancedMesh) nichée dans l'arc !
      if (k >= 1 && k <= archSegs - 2) {
        const ringMid = frontIn[k].clone().add(frontOut[k]).add(frontIn[k + 1]).add(frontOut[k + 1]).multiplyScalar(0.25);
        queueFiligreeArc(ringMid.x, ringMid.y, ringMid.z, 0.30, faceRotY, 0, 1.55, 1.55, 1.55);
        queueFiligreeArc(ringMid.x, ringMid.y, ringMid.z, 0.30, faceRotY, Math.PI, 1.55, 1.55, 1.55);
      }

      // Tympan ajouré (montants verticaux + diagonales entre l'extrados et la poutre du 1er étage)
      const topFront0 = makeFacePt(faceIdx, frontOut[k].x * (faceIdx < 2 ? 1 : 0) + frontOut[k].z * (faceIdx >= 2 ? 1 : 0), archTopY, 0);
      const topFront1 = makeFacePt(faceIdx, frontOut[k + 1].x * (faceIdx < 2 ? 1 : 0) + frontOut[k + 1].z * (faceIdx >= 2 ? 1 : 0), archTopY, 0);
      const topBack0 = makeFacePt(faceIdx, backOut[k].x * (faceIdx < 2 ? 1 : 0) + backOut[k].z * (faceIdx >= 2 ? 1 : 0), archTopY, archDepth);

      const spandrelH = archTopY - frontOut[k].y;
      if (spandrelH > 2.0) {
        queueBeam(frontOut[k], topFront0, 0.42, 0);
        queueBeam(backOut[k], topBack0, 0.36, 0);
        if (spandrelH > 4.2) {
          queueBeam(frontOut[k], topFront1, 0.30, 0);
          queueBeam(topFront0, frontOut[k + 1], 0.30, 0);
        }
        // Barre intermédiaire horizontale dans les grands écoinçons latéraux
        if (spandrelH > 12.0) {
          const midF0 = frontOut[k].clone().lerp(topFront0, 0.5);
          const midF1 = frontOut[k + 1].clone().lerp(topFront1, 0.5);
          queueBeam(midF0, midF1, 0.32, 0);
        }
      }
    }
  }

  // --- C. FÛT CENTRAL ÉLANCÉ (2e ÉTAGE 115,7 m -> SOMMET 276 m) + CONVERGENCE + GALERIE 196 m ---
  // 1) Zone de convergence (115,7 -> 148 m, 6 travées courbes où les 4 piliers fusionnent)
  const mergeLevels = [115.7, 121.0, 126.5, 132.0, 137.5, 143.0, 148.5];
  for (let i = 0; i < mergeLevels.length - 1; i++) {
    const y0 = mergeLevels[i];
    const y1 = mergeLevels[i + 1];
    const p0 = sampleTowerProfile(y0);
    const p1 = sampleTowerProfile(y1);
    const rOut0 = p0.centerSpan + p0.legHalf;
    const rOut1 = p1.centerSpan + p1.legHalf;
    const rIn0 = Math.max(3.4, p0.centerSpan - p0.legHalf * 0.72);
    const rIn1 = Math.max(3.4, p1.centerSpan - p1.legHalf * 0.72);

    const out0 = [
      new THREE.Vector3(-rOut0, y0, -rOut0), new THREE.Vector3(rOut0, y0, -rOut0),
      new THREE.Vector3(rOut0, y0, rOut0),   new THREE.Vector3(-rOut0, y0, rOut0),
    ];
    const out1 = [
      new THREE.Vector3(-rOut1, y1, -rOut1), new THREE.Vector3(rOut1, y1, -rOut1),
      new THREE.Vector3(rOut1, y1, rOut1),   new THREE.Vector3(-rOut1, y1, rOut1),
    ];
    const in0 = [
      new THREE.Vector3(-rIn0, y0, -rIn0), new THREE.Vector3(rIn0, y0, -rIn0),
      new THREE.Vector3(rIn0, y0, rIn0),   new THREE.Vector3(-rIn0, y0, rIn0),
    ];
    const in1 = [
      new THREE.Vector3(-rIn1, y1, -rIn1), new THREE.Vector3(rIn1, y1, -rIn1),
      new THREE.Vector3(rIn1, y1, rIn1),   new THREE.Vector3(-rIn1, y1, rIn1),
    ];

    for (let k = 0; k < 4; k++) {
      const nextK = (k + 1) % 4;
      // Arbalétriers extérieurs + arêtes intérieures de convergence
      queueBeam(out0[k], out1[k], 0.94, 1);
      queueBeam(in0[k], in1[k], 0.62, 1);
      queueBeam(out1[k], in1[k], 0.44, 1);
      queueBeam(out1[k], out1[nextK], 0.56, 1);

      // 2 panneaux en X côte à côte sur chaque face large
      const m0 = out0[k].clone().lerp(out0[nextK], 0.5);
      const m1 = out1[k].clone().lerp(out1[nextK], 0.5);
      queueBeam(m0, m1, 0.36, 1);
      queueBeam(out0[k], m1, 0.34, 1);
      queueBeam(m0, out1[k], 0.34, 1);
      queueBeam(m0, out1[nextK], 0.34, 1);
      queueBeam(out0[nextK], m1, 0.34, 1);
    }
  }

  // 2) Grande flèche treillis (148,5 -> 266 m, 20 travées fines + noyau central ascenseurs !)
  const shaftSteps = 20;
  for (let i = 0; i < shaftSteps; i++) {
    const y0 = THREE.MathUtils.lerp(148.5, 266.0, i / shaftSteps);
    const y1 = THREE.MathUtils.lerp(148.5, 266.0, (i + 1) / shaftSteps);
    const tier = y0 < 192 ? 1 : 2;
    const p0 = sampleTowerProfile(y0);
    const p1 = sampleTowerProfile(y1);
    const r0 = p0.centerSpan + p0.legHalf * 0.95;
    const r1 = p1.centerSpan + p1.legHalf * 0.95;

    const u0 = [
      new THREE.Vector3(-r0, y0, -r0), new THREE.Vector3(r0, y0, -r0),
      new THREE.Vector3(r0, y0, r0),   new THREE.Vector3(-r0, y0, r0),
    ];
    const u1 = [
      new THREE.Vector3(-r1, y1, -r1), new THREE.Vector3(r1, y1, -r1),
      new THREE.Vector3(r1, y1, r1),   new THREE.Vector3(-r1, y1, r1),
    ];

    const chordT = THREE.MathUtils.lerp(0.86, 0.62, i / shaftSteps);
    const braceT = THREE.MathUtils.lerp(0.36, 0.25, i / shaftSteps);

    for (let k = 0; k < 4; k++) {
      const nextK = (k + 1) % 4;
      queueBeam(u0[k], u1[k], chordT, tier);
      queueBeam(u1[k], u1[nextK], chordT * 0.56, tier);

      if (y0 < 198) {
        const m0 = u0[k].clone().lerp(u0[nextK], 0.5);
        const m1 = u1[k].clone().lerp(u1[nextK], 0.5);
        queueBeam(m0, m1, braceT * 0.9, tier);
        queueBeam(u0[k], m1, braceT * 0.85, tier);
        queueBeam(m0, u1[k], braceT * 0.85, tier);
        queueBeam(m0, u1[nextK], braceT * 0.85, tier);
        queueBeam(u0[nextK], m1, braceT * 0.85, tier);
      } else {
        queueBeam(u0[k], u1[nextK], braceT, tier);
        queueBeam(u0[nextK], u1[k], braceT, tier);
      }
    }

    // Diaphragme intérieur tous les 3 étages pour la profondeur visuelle
    if (i % 3 === 1) {
      queueBeam(u1[0], u1[2], braceT * 0.8, tier);
      queueBeam(u1[1], u1[3], braceT * 0.8, tier);
    }
  }

  // Plateforme technique intermédiaire authentique à y = 196 m (plateforme de repos / peinture)
  {
    const yMidP = 196.0;
    const pM = sampleTowerProfile(yMidP);
    const rM = pM.centerSpan + pM.legHalf + 1.35;
    addBox(rM * 2, 1.3, rM * 2, 0, yMidP, 0, matIronMid, { parent: towerStaticShell });
    addBox(rM * 2 + 0.6, 0.45, rM * 2 + 0.6, 0, yMidP + 0.75, 0, matIronDark, { parent: towerStaticShell });
    // Garde-corps fin
    [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dz]) => {
      const len = rM * 2;
      const pA = new THREE.Vector3(dx !== 0 ? dx * rM : -rM, yMidP + 1.8, dz !== 0 ? dz * rM : -rM);
      const pB = new THREE.Vector3(dx !== 0 ? dx * rM : rM, yMidP + 1.8, dz !== 0 ? dz * rM : rM);
      queueBeam(pA, pB, 0.22, 2);
      for (let s = -4; s <= 4; s++) {
        const u = (s / 4) * (len * 0.48);
        const bx = dx !== 0 ? dx * rM : u;
        const bz = dz !== 0 ? dz * rM : u;
        queueBeam(new THREE.Vector3(bx, yMidP + 0.65, bz), new THREE.Vector3(bx, yMidP + 1.8, bz), 0.16, 2);
      }
    });
  }

  // 3) Grand chapiteau évasé en consoles courbes sous le Sommet (y = 264 -> 276 m)
  {
    const rBot = 5.95;
    const rTop = 9.05;
    const stepsC = 5;
    for (let f = 0; f < 4; f++) {
      const a0 = f * Math.PI * 0.5;
      const cosA = Math.cos(a0);
      const sinA = Math.sin(a0);
      [-0.86, -0.30, 0.30, 0.86].forEach((latFrac) => {
        for (let k = 0; k < stepsC; k++) {
          const t0 = k / stepsC;
          const t1 = (k + 1) / stepsC;
          const y0 = THREE.MathUtils.lerp(264.0, 275.4, t0);
          const y1 = THREE.MathUtils.lerp(264.0, 275.4, t1);
          // Courbe concave en corbeau (flair vers l'extérieur en montant !)
          const r0 = THREE.MathUtils.lerp(rBot, rTop, t0 * t0);
          const r1 = THREE.MathUtils.lerp(rBot, rTop, t1 * t1);
          const l0 = latFrac * r0;
          const l1 = latFrac * r1;
          const p0 = new THREE.Vector3(r0 * cosA - l0 * sinA, y0, r0 * sinA + l0 * cosA);
          const p1 = new THREE.Vector3(r1 * cosA - l1 * sinA, y1, r1 * sinA + l1 * cosA);
          queueBeam(p0, p1, 0.56, 2);
        }
      });
      // Ceintures & croisillons du chapiteau
      const yA = 266.0;
      const yB = 275.2;
      const cA0 = new THREE.Vector3(rBot * cosA - rBot * sinA, yA, rBot * sinA + rBot * cosA);
      const cA1 = new THREE.Vector3(rBot * cosA + rBot * sinA, yA, rBot * sinA - rBot * cosA);
      const cB0 = new THREE.Vector3(rTop * cosA - rTop * sinA, yB, rTop * sinA + rTop * cosA);
      const cB1 = new THREE.Vector3(rTop * cosA + rTop * sinA, yB, rTop * sinA - rTop * cosA);
      queueBeam(cB0, cB1, 0.72, 2);
      queueBeam(cA0, cB1, 0.28, 2);
      queueBeam(cA1, cB0, 0.28, 2);
    }
  }

  // --- D. 16 MASSIFS DE FONDATION SCULPTÉS EN PIERRE DE TAILLE + SABOTS D'ANCRAGE + BUSTE DE GUSTAVE EIFFEL ---
  legSigns.forEach(([sx, sz], legIdx) => {
    const corners = getCornerPoints(0, sx, sz);
    const legYaw = Math.atan2(-sx, -sz);
    corners.forEach((pt) => {
      const pierG = new THREE.Group();
      pierG.position.set(pt.x, 0, pt.z);
      pierG.rotation.y = legYaw;
      // Socle granit large biseauté
      addBox(7.2, 0.9, 7.2, 0, 0.45, 0, matGranite, { parent: pierG });
      // Massif pyramidal en pierre de taille rustiquée (incliné vers l'axe du pilier)
      const masonry = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 4.4, 4.2, 4), matRusticatedStone);
      masonry.position.y = 2.95;
      masonry.rotation.y = Math.PI * 0.25;
      masonry.castShadow = true;
      masonry.receiveShadow = true;
      pierG.add(masonry);
      // Corniche supérieure en pierre claire
      addBox(5.2, 0.55, 5.2, 0, 5.15, 0, matStoneLight, { parent: pierG });
      // Sabot d'ancrage massif en fonte rivetée (vérins hydrauliques 1889 !)
      addBox(3.4, 1.35, 3.4, 0, 5.95, 0, matIronDark, { parent: pierG });
      [-1.1, 1.1].forEach((gx) => {
        addBox(0.32, 1.7, 3.8, gx, 6.2, 0, matIronDark, { parent: pierG });
      });
      towerStaticShell.add(pierG);
      registerLocalCircleCollider(pt.x, pt.z, 3.8);
    });

    // Pavillon Beaux-Arts d'accueil & billetterie sous chaque pilier (toit zinc, arcades vitrées & hall éclairé)
    const cx = sx * 49.5;
    const cz = sz * 49.5;
    const pavG = new THREE.Group();
    pavG.position.set(cx, 0, cz);
    pavG.rotation.y = legYaw;
    addBox(12.2, 0.45, 10.2, 0, 0.22, 0, matGranite, { parent: pavG });
    addBox(11.4, 4.6, 9.2, 0, 2.75, 0, matPavilion, { parent: pavG });
    addBox(10.6, 3.4, 9.5, 0, 2.65, 0, matGlassWindow, { cast: false, parent: pavG });
    addBox(9.2, 2.8, 7.6, 0, 2.5, 0, matWarmInterior, { cast: false, parent: pavG });
    // Meneaux en fonte encadrant les baies
    for (let m = -4; m <= 4; m += 2) {
      addBox(0.24, 3.8, 9.6, m, 2.7, 0, matIronDark, { parent: pavG });
    }
    // Corniche & toiture mansardée à crête dorée
    addBox(12.4, 0.45, 10.2, 0, 5.2, 0, matIronDark, { parent: pavG });
    const pavRoof = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 7.6, 2.1, 4), matIronBase);
    pavRoof.position.y = 6.45;
    pavRoof.rotation.y = Math.PI * 0.25;
    pavRoof.scale.set(1.12, 1.0, 0.92);
    pavG.add(pavRoof);
    addBox(5.2, 0.35, 0.25, 0, 7.65, 0, matGold, { parent: pavG });
    towerStaticShell.add(pavG);
    registerLocalCircleCollider(cx, cz, 6.2);

    // Buste doré de Gustave Eiffel par Antoine Bourdelle (1929) devant le Pilier Nord (legIdx === 0)
    if (legIdx === 0) {
      const bustX = -26.5;
      const bustZ = -26.5;
      addBox(3.4, 0.5, 3.4, bustX, 0.25, bustZ, matGranite, { parent: towerStaticShell });
      addBox(2.0, 3.4, 2.0, bustX, 2.2, bustZ, matStoneLight, { parent: towerStaticShell });
      addBox(1.5, 0.55, 0.22, bustX + 0.55, 2.6, bustZ + 0.55, matGold, { parent: towerStaticShell });
      const bustShoulders = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.72, 0.75, 10), matGold);
      bustShoulders.position.set(bustX, 4.25, bustZ);
      towerStaticShell.add(bustShoulders);
      const bustHead = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), matGold);
      bustHead.position.set(bustX, 4.95, bustZ);
      towerStaticShell.add(bustHead);
      registerLocalCircleCollider(bustX, bustZ, 2.0);
    }
  });

  /**
   * ==========================================================================
   * 2. LES 3 ÉTAGES VISITABLES & LE SOMMET (330,0 m) — FUSIONNÉS DANS towerStaticShell
   * ==========================================================================
   */

  // Helper pour les 4 panneaux de la Frise des 72 vrais Savants (18 noms distincts par face !)
  function addScholarsFriezeFace(faceIdx, width, height, x, y, z, rotY) {
    const geo = new THREE.PlaneGeometry(width, height);
    // Row 0..3 dans l'atlas vertical (y=0 en haut du canvas -> V = 1 en WebGL)
    const vTop = 1.0 - faceIdx * 0.25;
    const vBot = vTop - 0.25;
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      const v = uv.getY(i);
      uv.setY(i, v > 0.5 ? vTop : vBot);
    }
    const mesh = new THREE.Mesh(geo, mat72Scholars);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    towerStaticShell.add(mesh);
  }

  // Helper garde-corps 3D ajouré en fer forgé (lisse haute + lisse basse + barreaux verticaux en InstancedMesh)
  function addOpenworkBalustrade(x0, z0, x1, z1, yBase, height, tier, postSpacing = 2.4) {
    const pA = new THREE.Vector3(x0, yBase + height, z0);
    const pB = new THREE.Vector3(x1, yBase + height, z1);
    const pMidA = new THREE.Vector3(x0, yBase + height * 0.52, z0);
    const pMidB = new THREE.Vector3(x1, yBase + height * 0.52, z1);
    queueBeam(pA, pB, 0.22, tier);
    queueBeam(pMidA, pMidB, 0.14, tier);
    const len = Math.hypot(x1 - x0, z1 - z0);
    const steps = Math.max(2, Math.round(len / postSpacing));
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      const px = THREE.MathUtils.lerp(x0, x1, t);
      const pz = THREE.MathUtils.lerp(z0, z1, t);
      queueBeam(
        new THREE.Vector3(px, yBase, pz),
        new THREE.Vector3(px, yBase + height, pz),
        k % 4 === 0 ? 0.20 : 0.12,
        tier
      );
    }
  }

  // --- A. PREMIER ÉTAGE (y = 57,6 m, 71 m × 71 m) ---
  {
    const y1 = 57.6;
    const half1 = 35.6;

    // 1) Consoles de soutènement en porte-à-faux + galerie d'arcades ajourées (56 arcades 3D sur les 4 faces !)
    for (let f = 0; f < 4; f++) {
      const rotY = f === 0 ? Math.PI : f === 1 ? 0 : f === 2 ? Math.PI * 0.5 : -Math.PI * 0.5;
      const nx = f === 2 ? 1 : f === 3 ? -1 : 0;
      const nz = f === 0 ? -1 : f === 1 ? 1 : 0;
      const tx = -nz;
      const tz = nx;

      // 8 grandes consoles obliques en fer forgé sous l'encorbellement
      for (let c = -3.5; c <= 3.5; c += 1.0) {
        const s = c * 9.0;
        const pLow = new THREE.Vector3(nx * 32.8 + tx * s, y1 - 8.2, nz * 32.8 + tz * s);
        const pHigh = new THREE.Vector3(nx * 35.5 + tx * s, y1 - 3.6, nz * 35.5 + tz * s);
        queueBeam(pLow, pHigh, 0.46, 0);
      }

      // 14 petites arcades semi-circulaires ajourées (y = 52,0 -> 54,4 m) caractéristiques du 1er étage !
      const archCount = 14;
      const span1 = 68.6;
      const aStep = span1 / archCount;
      for (let a = 0; a < archCount; a++) {
        const s = -span1 * 0.5 + (a + 0.5) * aStep;
        const ax = nx * 35.35 + tx * s;
        const az = nz * 35.35 + tz * s;
        queueFiligreeArc(ax, y1 - 4.85, az, 0, rotY, 0, aStep * 0.45, 1.55, 1.2);
        // Pilastre vertical séparateur d'arcade
        const ps = -span1 * 0.5 + a * aStep;
        queueBeam(
          new THREE.Vector3(nx * 35.35 + tx * ps, y1 - 5.9, nz * 35.35 + tz * ps),
          new THREE.Vector3(nx * 35.35 + tx * ps, y1 - 3.2, nz * 35.35 + tz * ps),
          0.32,
          0
        );
      }
    }

    // 2) Frise dorée intégrale des 72 vrais Savants (4 faces distinctes × 18 noms = 72 savants !)
    addBox(70.4, 3.1, 70.4, 0, y1 - 2.15, 0, matIronBase, { parent: towerStaticShell });
    addScholarsFriezeFace(0, 70.6, 2.8, 0, y1 - 2.15, -35.42, Math.PI);       // Face Trocadéro (-Z)
    addScholarsFriezeFace(1, 70.6, 2.8, -35.42, y1 - 2.15, 0, -Math.PI * 0.5); // Face Grenelle (-X)
    addScholarsFriezeFace(2, 70.6, 2.8, 0, y1 - 2.15, +35.42, 0);              // Face École Militaire (+Z)
    addScholarsFriezeFace(3, 70.6, 2.8, +35.42, y1 - 2.15, 0, Math.PI * 0.5);  // Face Bourdonnais (+X)

    // Corniches moulurées supérieure & inférieure + liseré doré
    addBox(71.6, 0.55, 71.6, 0, y1 - 0.52, 0, matIronDark, { parent: towerStaticShell });
    addBox(71.2, 0.45, 71.2, 0, y1 - 3.75, 0, matIronDark, { parent: towerStaticShell });
    addBox(71.8, 0.24, 71.8, 0, y1 - 0.86, 0, matGold, { cast: false, parent: towerStaticShell });

    // 3) Tablier carré du 1er étage percé du grand vide central (35 m × 35 m)
    addBox(71.2, 1.1, 18.0, 0, y1 - 0.55, -26.6, matDeck, { parent: towerStaticShell });
    addBox(71.2, 1.1, 18.0, 0, y1 - 0.55, +26.6, matDeck, { parent: towerStaticShell });
    addBox(18.0, 1.1, 35.2, -26.6, y1 - 0.55, 0, matDeck, { parent: towerStaticShell });
    addBox(18.0, 1.1, 35.2, +26.6, y1 - 0.55, 0, matDeck, { parent: towerStaticShell });

    // 4) Plancher de verre spectaculaire encadré de poutrelles acier + garde-corps vitrés inclinés
    addBox(35.2, 0.16, 4.6, 0, y1 + 0.04, -15.3, matGlassFloor, { cast: false, parent: towerStaticShell });
    addBox(35.2, 0.16, 4.6, 0, y1 + 0.04, +15.3, matGlassFloor, { cast: false, parent: towerStaticShell });
    addBox(4.6, 0.16, 26.0, -15.3, y1 + 0.04, 0, matGlassFloor, { cast: false, parent: towerStaticShell });
    addBox(4.6, 0.16, 26.0, +15.3, y1 + 0.04, 0, matGlassFloor, { cast: false, parent: towerStaticShell });
    // Poutrelles de cadre & parapet vitré du vide central (13 m)
    addOpenworkBalustrade(-13.0, -13.0, 13.0, -13.0, y1, 1.45, 0, 2.6);
    addOpenworkBalustrade(-13.0, 13.0, 13.0, 13.0, y1, 1.45, 0, 2.6);
    addOpenworkBalustrade(-13.0, -13.0, -13.0, 13.0, y1, 1.45, 0, 2.6);
    addOpenworkBalustrade(13.0, -13.0, 13.0, 13.0, y1, 1.45, 0, 2.6);

    // Garde-corps périmétriques extérieurs ajourés en fer forgé
    addOpenworkBalustrade(-half1, -half1, half1, -half1, y1, 1.55, 0, 2.5);
    addOpenworkBalustrade(-half1, half1, half1, half1, y1, 1.55, 0, 2.5);
    addOpenworkBalustrade(-half1, -half1, -half1, half1, y1, 1.55, 0, 2.5);
    addOpenworkBalustrade(half1, -half1, half1, half1, y1, 1.55, 0, 2.5);

    // 5) 3 Pavillons contemporains inclinés du 1er étage (Madame Brasserie, Pavillon Ferrié, Salle Gustave Eiffel)
    const addFirstFloorPavilion = (px, pz, w, d, rotY = 0) => {
      const g = new THREE.Group();
      g.position.set(px, y1, pz);
      g.rotation.y = rotY;
      // Corps vitré panoramique légèrement incliné + intérieur doré chaleureux + auvent terracotta
      addBox(w, 0.45, d, 0, 0.22, 0, matIronDark, { parent: g });
      addBox(w - 1.4, 5.2, d - 1.4, 0, 2.8, 0, matWarmInterior, { cast: false, parent: g });
      addBox(w - 0.2, 5.6, d - 0.2, 0, 3.0, 0, matGlassWindow, { cast: false, parent: g });
      // Toiture & joues inclinées rouge-brun emblématiques
      addBox(w + 1.6, 0.85, d + 1.6, 0, 6.1, 0, matPavilion, { parent: g });
      addBox(w + 2.0, 0.35, d + 2.0, 0, 6.65, 0, matIronDark, { parent: g });
      // Brise-soleil / montants verticaux extérieurs
      const fins = Math.max(4, Math.round(w / 3.4));
      for (let i = 0; i <= fins; i++) {
        const fx = -w * 0.48 + (i / fins) * (w * 0.96);
        addBox(0.24, 5.8, d + 0.4, fx, 3.05, 0, matPavilion, { parent: g });
      }
      towerStaticShell.add(g);
    };
    addFirstFloorPavilion(0, -25.2, 27.0, 9.2, 0);              // Madame Brasserie (côté Seine/Trocadéro)
    addFirstFloorPavilion(25.2, 0, 25.0, 9.2, Math.PI * 0.5);  // Pavillon Ferrié (Est)
    addFirstFloorPavilion(-25.2, 0, 25.0, 9.2, Math.PI * 0.5); // Pavillon Gustave Eiffel (Ouest)
  }

  // --- B. DEUXIÈME ÉTAGE DOUBLE-PLATEAU (y = 115,7 m & 121,2 m) + 40 ARCADES + LE JULES VERNE ---
  {
    const y2 = 115.7;
    const half2 = 20.9;

    // 1) Consoles de soutènement + 40 arcades ajourées périmétriques sous le 2e étage (10 par face)
    for (let f = 0; f < 4; f++) {
      const rotY = f === 0 ? Math.PI : f === 1 ? 0 : f === 2 ? Math.PI * 0.5 : -Math.PI * 0.5;
      const nx = f === 2 ? 1 : f === 3 ? -1 : 0;
      const nz = f === 0 ? -1 : f === 1 ? 1 : 0;
      const tx = -nz;
      const tz = nx;

      for (let c = -2.5; c <= 2.5; c += 1.0) {
        const s = c * 6.8;
        queueBeam(
          new THREE.Vector3(nx * 18.2 + tx * s, y2 - 5.6, nz * 18.2 + tz * s),
          new THREE.Vector3(nx * 20.8 + tx * s, y2 - 1.6, nz * 20.8 + tz * s),
          0.42,
          1
        );
      }

      const archCount2 = 10;
      const span2 = 39.6;
      const step2 = span2 / archCount2;
      for (let a = 0; a < archCount2; a++) {
        const s = -span2 * 0.5 + (a + 0.5) * step2;
        queueFiligreeArc(nx * 20.75 + tx * s, y2 - 3.35, nz * 20.75 + tz * s, 0, rotY, 0, step2 * 0.44, 1.32, 1.1);
        const ps = -span2 * 0.5 + a * step2;
        queueBeam(
          new THREE.Vector3(nx * 20.75 + tx * ps, y2 - 4.2, nz * 20.75 + tz * ps),
          new THREE.Vector3(nx * 20.75 + tx * ps, y2 - 1.5, nz * 20.75 + tz * ps),
          0.28,
          1
        );
      }
    }

    // 2) Tablier inférieur (115,7 m) + ceinture rivetée + garde-corps ajourés
    addBox(42.0, 2.0, 42.0, 0, y2 - 1.0, 0, matDeck, { parent: towerStaticShell });
    addBox(42.4, 0.55, 42.4, 0, y2 - 0.25, 0, matIronMid, { parent: towerStaticShell });
    addBox(42.2, 0.45, 42.2, 0, y2 - 2.05, 0, matIronDark, { parent: towerStaticShell });
    addOpenworkBalustrade(-half2, -half2, half2, -half2, y2, 1.55, 1, 2.2);
    addOpenworkBalustrade(-half2, half2, half2, half2, y2, 1.55, 1, 2.2);
    addOpenworkBalustrade(-half2, -half2, -half2, half2, y2, 1.55, 1, 2.2);
    addOpenworkBalustrade(half2, -half2, half2, half2, y2, 1.55, 1, 2.2);

    // 3) Galerie vitrée & Restaurant gastronomique « Le Jules Verne » (y = 115,7 -> 121,2 m)
    addBox(30.2, 5.3, 30.2, 0, y2 + 2.65, 0, matIronMid, { parent: towerStaticShell });
    addBox(28.6, 4.0, 28.6, 0, y2 + 2.65, 0, matWarmInterior, { cast: false, parent: towerStaticShell });
    addBox(30.6, 4.2, 30.6, 0, y2 + 2.65, 0, matGlassWindow, { cast: false, parent: towerStaticShell });
    // Extension panoramique Sud du Jules Verne (surplombant le Champ-de-Mars)
    addBox(16.5, 4.8, 6.2, 0, y2 + 2.4, +16.4, matIronDark, { parent: towerStaticShell });
    addBox(15.2, 3.5, 6.5, 0, y2 + 2.4, +16.4, matWarmInterior, { cast: false, parent: towerStaticShell });
    addBox(16.8, 3.8, 6.6, 0, y2 + 2.4, +16.4, matGlassWindow, { cast: false, parent: towerStaticShell });
    // Meneaux verticaux tout autour de la galerie vitrée
    for (let m = -14; m <= 14; m += 3.5) {
      addBox(0.32, 5.4, 31.0, m, y2 + 2.65, 0, matIronDark, { parent: towerStaticShell });
      addBox(31.0, 5.4, 0.32, 0, y2 + 2.65, m, matIronDark, { parent: towerStaticShell });
    }

    // 4) Plateforme d'observation supérieure du 2e étage (y = 121,2 m, 35,8 m × 35,8 m)
    const y2Top = y2 + 5.5;
    const h2Top = 17.8;
    addBox(35.8, 1.25, 35.8, 0, y2Top - 0.6, 0, matDeck, { parent: towerStaticShell });
    addBox(36.4, 0.45, 36.4, 0, y2Top - 0.15, 0, matIronMid, { parent: towerStaticShell });
    addOpenworkBalustrade(-h2Top, -h2Top, h2Top, -h2Top, y2Top, 1.5, 1, 2.1);
    addOpenworkBalustrade(-h2Top, h2Top, h2Top, h2Top, y2Top, 1.5, 1, 2.1);
    addOpenworkBalustrade(-h2Top, -h2Top, -h2Top, h2Top, y2Top, 1.5, 1, 2.1);
    addOpenworkBalustrade(h2Top, -h2Top, h2Top, h2Top, y2Top, 1.5, 1, 2.1);
  }

  // --- C. SOMMET (y = 276 m -> 330,0 m) : BUREAU DE GUSTAVE EIFFEL, CAMPANILE BEAUX-ARTS, PHARE & MÂT TNT ---
  {
    const yS = 276.0;
    const hS = 9.2;

    // 1) Plateforme inférieure panoramique (18,6 m × 18,6 m) + 24 petites arcades périmétriques
    addBox(18.6, 1.75, 18.6, 0, yS - 0.85, 0, matDeck, { parent: towerStaticShell });
    addBox(19.2, 0.48, 19.2, 0, yS - 0.15, 0, matIronTop, { parent: towerStaticShell });
    addBox(19.0, 0.24, 19.0, 0, yS - 1.55, 0, matGold, { cast: false, parent: towerStaticShell });
    for (let f = 0; f < 4; f++) {
      const rotY = f === 0 ? Math.PI : f === 1 ? 0 : f === 2 ? Math.PI * 0.5 : -Math.PI * 0.5;
      const nx = f === 2 ? 1 : f === 3 ? -1 : 0;
      const nz = f === 0 ? -1 : f === 1 ? 1 : 0;
      const tx = -nz;
      const tz = nx;
      for (let a = 0; a < 6; a++) {
        const s = -7.5 + (a + 0.5) * 2.5;
        queueFiligreeArc(nx * 9.3 + tx * s, yS - 2.3, nz * 9.3 + tz * s, 0, rotY, 0, 1.12, 0.95, 0.85);
      }
    }
    addOpenworkBalustrade(-hS, -hS, hS, -hS, yS, 1.55, 2, 1.85);
    addOpenworkBalustrade(-hS, hS, hS, hS, yS, 1.55, 2, 1.85);
    addOpenworkBalustrade(-hS, -hS, -hS, hS, yS, 1.55, 2, 1.85);
    addOpenworkBalustrade(hS, -hS, hS, hS, yS, 1.55, 2, 1.85);

    // 2) Galerie vitrée & Bureau historique de Gustave Eiffel (276 -> 281,8 m)
    addBox(13.2, 5.6, 13.2, 0, yS + 2.8, 0, matIronTop, { parent: towerStaticShell });
    addBox(12.2, 4.4, 12.2, 0, yS + 2.8, 0, matWarmInterior, { cast: false, parent: towerStaticShell });
    addBox(13.6, 4.6, 13.6, 0, yS + 2.8, 0, matGlassWindow, { cast: false, parent: towerStaticShell });
    for (let m = -6; m <= 6; m += 2.4) {
      addBox(0.24, 5.6, 13.9, m, yS + 2.8, 0, matIronDark, { parent: towerStaticShell });
      addBox(13.9, 5.6, 0.24, 0, yS + 2.8, m, matIronDark, { parent: towerStaticShell });
    }

    // 3) Terrasse supérieure en plein air & Bar à Champagne (281,8 m)
    const ySTop = yS + 5.8;
    const hSTop = 7.6;
    addBox(15.4, 1.1, 15.4, 0, ySTop - 0.55, 0, matDeck, { parent: towerStaticShell });
    addBox(15.9, 0.42, 15.9, 0, ySTop - 0.12, 0, matIronTop, { parent: towerStaticShell });
    addOpenworkBalustrade(-hSTop, -hSTop, hSTop, -hSTop, ySTop, 1.5, 2, 1.7);
    addOpenworkBalustrade(-hSTop, hSTop, hSTop, hSTop, ySTop, 1.5, 2, 1.7);
    addOpenworkBalustrade(-hSTop, -hSTop, -hSTop, hSTop, ySTop, 1.5, 2, 1.7);
    addOpenworkBalustrade(hSTop, -hSTop, hSTop, hSTop, ySTop, 1.5, 2, 1.7);

    // 4) Campanile octogonal Beaux-Arts (282 -> 295 m) avec 8 baies vitrées, pilastres & balcon du phare !
    const campBase = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 5.3, 12.2, 8), matIronTop);
    campBase.position.y = ySTop + 6.1;
    campBase.castShadow = true;
    towerStaticShell.add(campBase);

    const campGlass = new THREE.Mesh(new THREE.CylinderGeometry(4.85, 5.15, 7.4, 8), matGlassWindow);
    campGlass.position.y = ySTop + 5.8;
    towerStaticShell.add(campGlass);

    const campCoreGlow = new THREE.Mesh(new THREE.CylinderGeometry(4.1, 4.4, 7.0, 8), matWarmInterior);
    campCoreGlow.position.y = ySTop + 5.8;
    towerStaticShell.add(campCoreGlow);

    // 8 pilastres d'angle du campanile + balcon circulaire du phare à y = 294,4 m
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
      queueBeam(
        new THREE.Vector3(Math.cos(a) * 5.2, ySTop + 0.2, Math.sin(a) * 5.2),
        new THREE.Vector3(Math.cos(a) * 4.65, ySTop + 12.6, Math.sin(a) * 4.65),
        0.38,
        2
      );
    }
    const phBalcony = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.2, 0.85, 16), matIronTop);
    phBalcony.position.y = ySTop + 12.5;
    towerStaticShell.add(phBalcony);
    const phRail = new THREE.Mesh(new THREE.TorusGeometry(5.35, 0.12, 8, 24), matIronDark);
    phRail.rotation.x = Math.PI * 0.5;
    phRail.position.y = ySTop + 13.75;
    towerStaticShell.add(phRail);

    // 5) Coupole nervurée bronze-fer + chambre vitrée lumineuse du Phare marin Fresnel (295 -> 301,2 m)
    const domeBaseY = ySTop + 13.0; // ~294,8 m
    const cupola = new THREE.Mesh(
      new THREE.SphereGeometry(4.55, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.52),
      matIronDark
    );
    cupola.scale.set(1, 0.92, 1);
    cupola.position.y = domeBaseY;
    towerStaticShell.add(cupola);
    // 8 nervures dorées sur la coupole + anneau de base doré
    const domeBelt = new THREE.Mesh(new THREE.TorusGeometry(4.55, 0.16, 8, 20), matGold);
    domeBelt.rotation.x = Math.PI * 0.5;
    domeBelt.position.y = domeBaseY + 0.15;
    towerStaticShell.add(domeBelt);

    // Lanterne vitrée du phare marin (y = 298,4 -> 301,4 m)
    const lanternDrum = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.25, 2.8, 12), matBeaconLens);
    lanternDrum.position.y = 299.8;
    towerStaticShell.add(lanternDrum);
    const lanternCap = new THREE.Mesh(new THREE.CylinderGeometry(2.45, 2.55, 0.6, 12), matIronTop);
    lanternCap.position.y = 301.35;
    towerStaticShell.add(lanternCap);

    // 6) Mât treillis TNT / Radio authentique en 3D (301,5 -> 330,0 m !) + 3 plateformes circulaires d'antennes
    const mastLevels = [301.4, 305.5, 310.0, 314.5, 319.0, 323.5, 327.0];
    const mastRadii  = [1.95,  1.62,  1.32,  1.05,  0.80,  0.54,  0.30];
    for (let i = 0; i < mastLevels.length - 1; i++) {
      const yA = mastLevels[i];
      const yB = mastLevels[i + 1];
      const rA = mastRadii[i];
      const rB = mastRadii[i + 1];
      for (let k = 0; k < 4; k++) {
        const a0 = (k / 4) * Math.PI * 2 + Math.PI * 0.25;
        const a1 = ((k + 1) / 4) * Math.PI * 2 + Math.PI * 0.25;
        const p0 = new THREE.Vector3(Math.cos(a0) * rA, yA, Math.sin(a0) * rA);
        const p1 = new THREE.Vector3(Math.cos(a0) * rB, yB, Math.sin(a0) * rB);
        const q0 = new THREE.Vector3(Math.cos(a1) * rA, yA, Math.sin(a1) * rA);
        const q1 = new THREE.Vector3(Math.cos(a1) * rB, yB, Math.sin(a1) * rB);
        queueBeam(p0, p1, 0.20, 2);
        queueBeam(p1, q1, 0.14, 2);
        queueBeam(p0, q1, 0.11, 2);
        queueBeam(q0, p1, 0.11, 2);
      }
    }
    // 3 plateformes techniques circulaires + paraboles & panneaux émetteurs blancs/rouges
    [
      { y: 306.0, r: 2.85, dishes: 6 },
      { y: 313.5, r: 2.15, dishes: 4 },
      { y: 320.2, r: 1.55, dishes: 4 },
    ].forEach(({ y, r, dishes }) => {
      const plat = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.92, 0.45, 14), matIronTop);
      plat.position.y = y;
      towerStaticShell.add(plat);
      const pRail = new THREE.Mesh(new THREE.TorusGeometry(r, 0.08, 6, 18), matIronDark);
      pRail.rotation.x = Math.PI * 0.5;
      pRail.position.y = y + 0.95;
      towerStaticShell.add(pRail);
      for (let d = 0; d < dishes; d++) {
        const da = (d / dishes) * Math.PI * 2;
        const dipole = new THREE.Mesh(new THREE.BoxGeometry(0.45, 2.2, 0.28), matMastWhite);
        dipole.position.set(Math.cos(da) * (r - 0.15), y + 1.3, Math.sin(da) * (r - 0.15));
        dipole.rotation.y = -da;
        towerStaticShell.add(dipole);
      }
    });
    // Flèche blanche/rouge sommitale & paratonnerre culminant à exactement 330,0 m !
    const topCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.34, 4.4, 8), matMastWhite);
    topCyl.position.y = 326.8;
    towerStaticShell.add(topCyl);
    const lightningRod = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.12, 2.4, 8), matGold);
    lightningRod.position.y = 328.8; // Sommet à 330,0 m exact !
    towerStaticShell.add(lightningRod);
  }

  // Balises lumineuses aéronautiques rouges au sommet (clignotement doux, non fusionnées)
  const aviationBeacons = [];
  [[0, 329.8, 0], [1.65, 319.6, 0], [-1.65, 319.6, 0]].forEach(([bx, by, bz], idx) => {
    const bMesh = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), matAviationRed);
    bMesh.position.set(bx, by, bz);
    bMesh.userData.noMerge = true;
    root.add(bMesh);
    aviationBeacons.push({ mesh: bMesh, phase: idx * 1.4 });
  });

  // Phare rotatif à double faisceau volumétrique doux (atténuation atmosphérique + bords Fresnel, zéro cône coupé !)
  const beaconGroup = new THREE.Group();
  beaconGroup.position.y = 300.0;
  beaconGroup.userData.noMerge = true;
  root.add(beaconGroup);

  const matBeaconBeam = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uOpacity: { value: 0.0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        vUv = uv;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        // vUv.y = 1.0 à la pointe du phare -> 0.0 à l'extrémité lointaine (fondu progressif jusqu'à 0 !)
        float axialFade = pow(clamp(vUv.y, 0.0, 1.0), 2.15) * smoothstep(0.0, 0.35, vUv.y);
        float edgeSoft = pow(abs(dot(normalize(vNormalView), normalize(vViewDir))), 1.85);
        float alpha = axialFade * edgeSoft * uOpacity;
        if (alpha < 0.004) discard;
        vec3 col = mix(vec3(0.88, 0.94, 1.0), vec3(1.0, 0.96, 0.80), vUv.y);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
  const beamConeGeo = new THREE.ConeGeometry(46, 860, 24, 1, true);
  beamConeGeo.translate(0, -430, 0);
  beamConeGeo.rotateX(Math.PI * 0.5);

  const beamA = new THREE.Mesh(beamConeGeo, matBeaconBeam);
  beaconGroup.add(beamA);
  const beamB = new THREE.Mesh(beamConeGeo, matBeaconBeam);
  beamB.rotation.y = Math.PI;
  beaconGroup.add(beamB);
  beaconGroup.visible = false;

  // --- INSTANCIATION DES ~5 500 POUTRELLES 3D (3 DRAW CALLS) & ~170 ARCADES/ROSACES (1 DRAW CALL) ---
  const beamGeo = new THREE.BoxGeometry(1, 1, 1);
  const beamMat4 = new THREE.Matrix4();
  const beamScale = new THREE.Vector3();
  [0, 1, 2].forEach((tier) => {
    const list = beams.filter((b) => b.tier === tier);
    if (!list.length) return;
    const inst = new THREE.InstancedMesh(beamGeo, ironMaterials[tier], list.length);
    inst.castShadow = true;
    inst.receiveShadow = true;
    list.forEach((b, idx) => {
      beamScale.set(b.sx, b.sy, b.sz);
      beamMat4.compose(b.pos, b.quat, beamScale);
      inst.setMatrixAt(idx, beamMat4);
    });
    inst.instanceMatrix.needsUpdate = true;
    root.add(inst);
  });

  if (filigreeArcs.length > 0) {
    const filigreeGeo = new THREE.TorusGeometry(1.0, 0.14, 6, 14, Math.PI);
    const filigreeInst = new THREE.InstancedMesh(filigreeGeo, matIronDark, filigreeArcs.length);
    filigreeInst.castShadow = false;
    filigreeInst.receiveShadow = true;
    filigreeArcs.forEach((fa, idx) => {
      beamMat4.compose(fa.pos, fa.quat, fa.scale);
      filigreeInst.setMatrixAt(idx, beamMat4);
    });
    filigreeInst.instanceMatrix.needsUpdate = true;
    root.add(filigreeInst);
  }

  // Fusion statique de toute la coque Tour Eiffel (fondations, pavillons, 3 étages, 72 savants, campanile) -> ~11 DC !
  mergeStaticGroupByMaterial(towerStaticShell);

  /**
   * ==========================================================================
   * 3. ASCENSEURS PANORAMIQUES INCLINÉS & VERTICAUX + SCINTILLEMENT ÉTOILÉ (2 200 ÉCLATS)
   * ==========================================================================
   */
  const elevatorGroup = new THREE.Group();
  root.add(elevatorGroup);

  function addLocalBoxTo(parent, w, h, d, x, y, z, mat) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }

  function addCylinderBetween(parent, pA, pB, rTop, rBot, mat) {
    const len = pA.distanceTo(pB);
    if (len < 0.05) return null;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, len, 6), mat);
    m.position.copy(pA).add(pB).multiplyScalar(0.5);
    tmpDir.subVectors(pB, pA).normalize();
    m.quaternion.setFromUnitVectors(upVec, tmpDir);
    parent.add(m);
    return m;
  }

  function buildInclinedElevatorCarriage(sx, sz, phase) {
    const carriage = new THREE.Group();
    carriage.rotation.y = Math.atan2(-sx, -sz);
    elevatorGroup.add(carriage);

    const bogie = new THREE.Group();
    carriage.add(bogie);
    [-1.35, 1.35].forEach((rx) => {
      addLocalBoxTo(bogie, 0.24, 4.4, 0.34, rx, 0, 0, matElevRail);
      [-1.55, 1.55].forEach((ry) => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.28, 12), matElevCable);
        wheel.rotation.z = Math.PI * 0.5;
        wheel.position.set(rx, ry, 0.05);
        bogie.add(wheel);
      });
    });
    [-1.4, 0, 1.4].forEach((ry) => addLocalBoxTo(bogie, 2.9, 0.22, 0.28, 0, ry, 0, matElevFrame));
    addLocalBoxTo(bogie, 2.5, 0.32, 1.6, 0, 0.4, -0.75, matElevFrame);

    const cabin = new THREE.Group();
    cabin.position.set(0, 0.25, -1.85);
    carriage.add(cabin);

    [-1.1, 1.1].forEach((ax) => {
      addLocalBoxTo(cabin, 0.24, 0.32, 1.85, ax, 0.2, 0.9, matElevFrame);
      addLocalBoxTo(cabin, 0.22, 0.28, 1.55, ax, 4.4, 0.9, matElevFrame);
    });

    addLocalBoxTo(cabin, 3.25, 0.28, 3.05, 0, 0.14, 0, matElevFrame);
    addLocalBoxTo(cabin, 3.35, 0.24, 3.15, 0, 2.45, 0, matElevAccent);
    addLocalBoxTo(cabin, 3.25, 0.28, 3.05, 0, 4.78, 0, matElevFrame);
    addLocalBoxTo(cabin, 2.1, 0.32, 1.9, 0, 5.05, 0, matElevAccent);

    [-1.52, 1.52].forEach((cx) => {
      [-1.42, 1.42].forEach((cz) => {
        addLocalBoxTo(cabin, 0.18, 4.65, 0.18, cx, 2.45, cz, matElevFrame);
      });
      addLocalBoxTo(cabin, 0.12, 4.65, 0.12, cx, 2.45, 0, matElevFrame);
    });
    [-1.42, 1.42].forEach((cz) => {
      addLocalBoxTo(cabin, 0.12, 4.65, 0.12, 0, 2.45, cz, matElevFrame);
    });

    addLocalBoxTo(cabin, 3.04, 2.02, 2.84, 0, 1.3, 0, matElevGlass);
    addLocalBoxTo(cabin, 3.04, 2.02, 2.84, 0, 3.6, 0, matElevGlass);

    const cylCore = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 4.5, 8), matGold);
    cylCore.position.set(0, 2.45, 0);
    cabin.add(cylCore);
    addLocalBoxTo(cabin, 2.2, 0.12, 2.0, 0, 2.28, 0, matElevInteriorGlow);
    addLocalBoxTo(cabin, 2.2, 0.12, 2.0, 0, 4.58, 0, matElevInteriorGlow);

    [[-0.7, 0.9, -0.4], [0.65, 0.9, 0.45], [-0.55, 3.2, 0.4], [0.7, 3.2, -0.35]].forEach(([px, py, pz]) => {
      addLocalBoxTo(cabin, 0.36, 1.15, 0.28, px, py, pz, matElevFrame);
    });

    mergeStaticGroupByMaterial(bogie);
    mergeStaticGroupByMaterial(cabin);
    bogie.userData.keepGroup = true;
    cabin.userData.keepGroup = true;
    carriage.userData.noMerge = true;

    return { carriage, bogie, sx, sz, phase };
  }

  const inclinedLegSpecs = [
    { sx: -1, sz: 1,  phase: 0.0 },
    { sx: 1,  sz: -1, phase: 2.1 },
    { sx: -1, sz: -1, phase: 4.2 },
  ];

  const inclinedElevators = inclinedLegSpecs.map(({ sx, sz, phase }) => {
    const perpX = -sz * Math.SQRT1_2;
    const perpZ = sx * Math.SQRT1_2;
    const steps = 22;

    for (let i = 0; i < steps; i++) {
      const y0 = 2.5 + (i / steps) * 112.0;
      const y1 = 2.5 + ((i + 1) / steps) * 112.0;
      const p0 = sampleTowerProfile(y0);
      const p1 = sampleTowerProfile(y1);

      const c0 = new THREE.Vector3(sx * p0.centerSpan, y0, sz * p0.centerSpan);
      const c1 = new THREE.Vector3(sx * p1.centerSpan, y1, sz * p1.centerSpan);

      [-1.35, 1.35].forEach((offset) => {
        const a = new THREE.Vector3(c0.x + perpX * offset, y0, c0.z + perpZ * offset);
        const b = new THREE.Vector3(c1.x + perpX * offset, y1, c1.z + perpZ * offset);
        addCylinderBetween(elevatorGroup, a, b, 0.16, 0.16, matElevRail);
      });
      addCylinderBetween(elevatorGroup, c0, c1, 0.06, 0.06, matElevCable);
      if (i % 2 === 0) {
        const tL = new THREE.Vector3(c0.x - perpX * 1.48, y0, c0.z - perpZ * 1.48);
        const tR = new THREE.Vector3(c0.x + perpX * 1.48, y0, c0.z + perpZ * 1.48);
        addCylinderBetween(elevatorGroup, tL, tR, 0.11, 0.11, matElevFrame);
      }
    }

    const canopy = new THREE.Group();
    const pLow = sampleTowerProfile(5.4);
    canopy.position.set(sx * pLow.centerSpan, 5.4, sz * pLow.centerSpan);
    canopy.rotation.y = Math.atan2(-sx, -sz);
    addLocalBoxTo(canopy, 5.2, 0.25, 4.2, 0, 3.6, -1.5, matElevGlass);
    addLocalBoxTo(canopy, 5.4, 0.18, 4.4, 0, 3.78, -1.5, matElevFrame);
    elevatorGroup.add(canopy);

    return buildInclinedElevatorCarriage(sx, sz, phase);
  });

  // Cage verticale centrale & 2 cabines vitrées du 2e étage (116 m) au Sommet (274 m)
  [-3.2, 3.2].forEach((vx) => {
    [-1.4, 1.4].forEach((vz) => {
      addLocalBoxTo(elevatorGroup, 0.18, 158, 0.18, vx, 195, vz, matElevRail);
    });
  });
  for (let gy = 122; gy <= 270; gy += 14) {
    addLocalBoxTo(elevatorGroup, 6.6, 0.22, 0.18, 0, gy, -1.4, matElevFrame);
    addLocalBoxTo(elevatorGroup, 6.6, 0.22, 0.18, 0, gy, 1.4, matElevFrame);
  }

  function buildVerticalElevatorCabin(xPos, phase) {
    const cab = new THREE.Group();
    cab.position.set(xPos, 120, 0);
    addLocalBoxTo(cab, 2.35, 0.22, 2.35, 0, 0.11, 0, matElevFrame);
    addLocalBoxTo(cab, 2.42, 0.18, 2.42, 0, 2.0, 0, matElevAccent);
    addLocalBoxTo(cab, 2.35, 0.22, 2.35, 0, 3.9, 0, matElevFrame);
    addLocalBoxTo(cab, 2.15, 3.6, 2.15, 0, 2.0, 0, matElevGlass);
    addLocalBoxTo(cab, 1.5, 0.1, 1.5, 0, 1.85, 0, matElevInteriorGlow);
    addLocalBoxTo(cab, 1.5, 0.1, 1.5, 0, 3.72, 0, matElevInteriorGlow);
    [-1.08, 1.08].forEach((mx) => {
      [-1.08, 1.08].forEach((mz) => {
        addLocalBoxTo(cab, 0.14, 3.85, 0.14, mx, 2.0, mz, matElevFrame);
      });
    });
    elevatorGroup.add(cab);
    return { mesh: cab, xPos, phase };
  }

  const verticalElevators = [
    buildVerticalElevatorCabin(-1.7, 0.0),
    buildVerticalElevatorCabin(1.7, Math.PI),
  ];
  verticalElevators.forEach((v) => {
    mergeStaticGroupByMaterial(v.mesh);
    v.mesh.userData.noMerge = true;
  });

  mergeStaticGroupByMaterial(elevatorGroup);

  function computeElevatorCycle01(tPhase) {
    const u = ((tPhase % 1) + 1) % 1;
    if (u < 0.08) return 0.0;
    if (u < 0.28) return THREE.MathUtils.smoothstep((u - 0.08) / 0.2, 0, 1) * 0.49;
    if (u < 0.36) return 0.49;
    if (u < 0.54) return 0.49 + THREE.MathUtils.smoothstep((u - 0.36) / 0.18, 0, 1) * 0.51;
    if (u < 0.64) return 1.0;
    if (u < 0.82) return 1.0 - THREE.MathUtils.smoothstep((u - 0.64) / 0.18, 0, 1) * 0.51;
    if (u < 0.88) return 0.49;
    return 0.49 * (1.0 - THREE.MathUtils.smoothstep((u - 0.88) / 0.12, 0, 1));
  }

  // Scintillement diamants haute précision (2 200 éclats étoilés en croix sur les arbalétriers, arcs & étages !)
  const sparkleCount = 2200;
  const sparklePositions = new Float32Array(sparkleCount * 3);
  const sparklePhases = new Float32Array(sparkleCount);

  for (let i = 0; i < sparkleCount; i++) {
    const t = i / sparkleCount;
    let px, py, pz;
    if (i % 9 === 0) {
      // Sur les 4 grands arcs semi-circulaires
      const f = i % 4;
      const a = THREE.MathUtils.lerp(0.12 * Math.PI, 0.88 * Math.PI, ((i * 31) % 100) / 100);
      const rA = THREE.MathUtils.lerp(archRIn, archROut, ((i * 19) % 10) / 10);
      const s = -Math.cos(a) * rA;
      py = archCenterY + Math.sin(a) * rA;
      const pt = makeFacePt(f, s, py, 0);
      px = pt.x;
      pz = pt.z;
    } else {
      py = 5 + t * 295;
      if (py <= 115.7) {
        const leg = legSigns[i % 4];
        const prof = sampleTowerProfile(py);
        const side = (i >> 2) % 4;
        const u = (((i * 73) % 100) / 100 - 0.5) * 2 * prof.legHalf;
        const lx = side === 0 ? -prof.legHalf : side === 1 ? prof.legHalf : u;
        const lz = side === 2 ? -prof.legHalf : side === 3 ? prof.legHalf : u;
        px = leg[0] * prof.centerSpan + lx;
        pz = leg[1] * prof.centerSpan + lz;
      } else if (py <= 276) {
        const prof = sampleTowerProfile(py);
        const r = prof.centerSpan + prof.legHalf * 0.96;
        const side = i % 4;
        const u = (((i * 97) % 100) / 100 - 0.5) * 2 * r;
        px = side === 0 ? -r : side === 1 ? r : u;
        pz = side === 2 ? -r : side === 3 ? r : u;
      } else {
        const r = Math.max(1.2, 5.2 * (1 - (py - 276) / 32));
        const a = i * 1.9;
        px = Math.cos(a) * r;
        pz = Math.sin(a) * r;
      }
    }
    sparklePositions[i * 3] = px;
    sparklePositions[i * 3 + 1] = py;
    sparklePositions[i * 3 + 2] = pz;
    sparklePhases[i] = (i * 17.37) % (Math.PI * 2);
  }

  const sparkleGeo = new THREE.BufferGeometry();
  sparkleGeo.setAttribute('position', new THREE.BufferAttribute(sparklePositions, 3));
  sparkleGeo.setAttribute('aPhase', new THREE.BufferAttribute(sparklePhases, 1));

  const sparkleMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uNightAlpha: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute float aPhase;
      uniform float uTime;
      uniform float uNightAlpha;
      varying float vTwinkle;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float w1 = sin(uTime * 13.5 + aPhase * 9.0);
        float w2 = sin(uTime * 6.7 + aPhase * 4.3);
        vTwinkle = smoothstep(0.16, 0.88, w1 * w2) * uNightAlpha;
        gl_PointSize = (6.5 + vTwinkle * 20.0) * (320.0 / max(18.0, -mvPosition.z));
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vTwinkle;
      void main() {
        if (vTwinkle < 0.02) discard;
        vec2 uv = gl_PointCoord - vec2(0.5);
        float d = length(uv);
        if (d > 0.5) discard;
        float core = pow(max(0.0, 1.0 - d * 2.2), 2.8);
        float crossH = exp(-abs(uv.y) * 26.0) * max(0.0, 1.0 - abs(uv.x) * 2.1);
        float crossV = exp(-abs(uv.x) * 26.0) * max(0.0, 1.0 - abs(uv.y) * 2.1);
        float star = min(1.0, core + (crossH + crossV) * 0.55);
        gl_FragColor = vec4(vec3(1.0, 0.95, 0.80), star * vTwinkle);
      }
    `,
  });
  const sparklePoints = new THREE.Points(sparkleGeo, sparkleMat);
  root.add(sparklePoints);

  // Projecteurs chauds nocturnes sur la Tour
  const towerNightLights = [
    new THREE.PointLight(0xffba5c, 0, 240, 1.35),
    new THREE.PointLight(0xffcb78, 0, 240, 1.35),
  ];
  towerNightLights[0].position.set(0, 34, 0);
  towerNightLights[1].position.set(0, 145, 0);
  root.add(towerNightLights[0], towerNightLights[1]);

  /**
   * ==========================================================================
   * 4. ENVIRONNEMENT IMMÉDIAT HAUTE FIDÉLITÉ :
   *    PARVIS & MUR DE VERRE, CARROUSEL DE LA TOUR EIFFEL, CHAMP-DE-MARS,
   *    ÉCOLE MILITAIRE, PONT D'IÉNA (AIGLES & CAVALIERS), TROCADÉRO & CHAILLOT
   * ==========================================================================
   */
  const envGroup = new THREE.Group();
  root.add(envGroup);

  const matGrassTex = new THREE.MeshStandardMaterial({ map: createNaturalGrassTexture(), roughness: 0.94 });
  const matGravelTex = new THREE.MeshStandardMaterial({ map: createGravelPathTexture(), roughness: 0.92 });
  const texAvenueRoad = createAvenueAsphaltTexture();
  const matAvenueTex = new THREE.MeshStandardMaterial({ map: texAvenueRoad, roughness: 0.88 });
  const matAsphaltPlain = new THREE.MeshStandardMaterial({ color: 0x36393f, roughness: 0.9 });
  const matCrosswalk = new THREE.MeshStandardMaterial({ color: 0xeeebe2, roughness: 0.82 });
  const matParkBench = new THREE.MeshStandardMaterial({ color: 0x2f4e37, roughness: 0.68 });
  const matLampPost = new THREE.MeshStandardMaterial({ color: 0x232928, roughness: 0.52, metalness: 0.45 });
  const matStreetLampGlow = new THREE.MeshStandardMaterial({
    color: 0xfff5d6,
    emissive: new THREE.Color(0xffbe55),
    emissiveIntensity: 0.25,
    roughness: 0.2,
  });
  const matSlateRoof = new THREE.MeshStandardMaterial({ color: 0x3d4753, roughness: 0.56, metalness: 0.34 });
  const matChaillotTex = new THREE.MeshStandardMaterial({ map: createChaillotFacadeTexture(), roughness: 0.78 });

  const haussFacadeMats = [
    new THREE.MeshStandardMaterial({ map: createHaussmannFacadeTexture('#e2d7c5', '#682724'), roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ map: createHaussmannFacadeTexture('#d8cbb7', '#274738'), roughness: 0.82 }),
    new THREE.MeshStandardMaterial({ map: createHaussmannFacadeTexture('#e7decb', '#2b3d59'), roughness: 0.79 }),
  ];

  function addAvenueRoad(width, length, x, y, z, horizontalX = false) {
    const geo = new THREE.BoxGeometry(width, 0.14, length);
    const repeatY = Math.max(1, Math.round(length / 26));
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      uv.setY(i, uv.getY(i) * repeatY);
    }
    const m = new THREE.Mesh(geo, matAvenueTex);
    m.position.set(x, y, z);
    m.castShadow = false;
    m.receiveShadow = true;
    if (horizontalX) m.rotation.y = Math.PI * 0.5;
    envGroup.add(m);
    return m;
  }

  function addIntersectionPad(w, d, x, z, yTop = 0.296) {
    return addBox(w, 0.08, d, x, yTop - 0.04, z, matAsphaltPlain, { cast: false, parent: envGroup });
  }

  function addCrosswalk(x, z, count = 7, alongX = false, yTop = 0.305) {
    const half = (count - 1) * 0.5;
    for (let k = -half; k <= half; k++) {
      if (alongX) {
        addBox(0.65, 0.02, 3.6, x + k * 1.45, yTop - 0.01, z, matCrosswalk, { cast: false, parent: envGroup });
      } else {
        addBox(3.6, 0.02, 0.65, x, yTop - 0.01, z + k * 1.45, matCrosswalk, { cast: false, parent: envGroup });
      }
    }
  }

  function yPontIena(z) {
    const u = THREE.MathUtils.clamp((z + 220) / 80, -1, 1);
    return 0.30 + 2.55 * (1 - u * u);
  }

  // Helper statue classique dorée sculptée (remplace les anciens blocs jaunes au Trocadéro & Pont d'Iéna)
  function addClassicalGoldStatue(x, y, z, scale = 1.0, rotY = 0, equestrian = false) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = rotY;
    g.scale.setScalar(scale);
    if (equestrian) {
      // Cheval cabré & cavalier (Les 4 Cavaliers du Pont d'Iéna)
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.52, 2.2, 8), matGold);
      body.rotation.x = Math.PI * 0.5;
      body.position.set(0, 1.45, 0);
      g.add(body);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.38, 1.15, 7), matGold);
      neck.position.set(0, 2.15, 0.95);
      neck.rotation.x = 0.45;
      g.add(neck);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.72), matGold);
      head.position.set(0, 2.6, 1.32);
      g.add(head);
      [[-0.3, -0.75], [0.3, -0.75], [-0.3, 0.75], [0.3, 0.75]].forEach(([lx, lz], i) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.4, 6), matGold);
        leg.position.set(lx, 0.7, lz);
        if (i === 2) { leg.rotation.x = -0.45; leg.position.y = 0.85; }
        g.add(leg);
      });
      // Cavalier + lance/bras levé
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 1.1, 8), matGold);
      torso.position.set(0, 2.35, -0.1);
      g.add(torso);
      const rHead = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 8), matGold);
      rHead.position.set(0, 3.1, -0.1);
      g.add(rHead);
    } else {
      // Figure drapée Art Déco debout (Parvis des Droits de l'Homme / Bassin de Varsovie)
      const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.52, 1.85, 8), matGold);
      robe.position.y = 0.92;
      g.add(robe);
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.28, 0.85, 8), matGold);
      torso.position.y = 2.15;
      g.add(torso);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 8), matGold);
      head.position.y = 2.82;
      g.add(head);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.95, 6), matGold);
      arm.position.set(0.38, 2.55, 0.15);
      arm.rotation.z = -0.55;
      g.add(arm);
    }
    envGroup.add(g);
  }

  // Helper Fontaine Wallace & Colonne Morris parisiennes
  function addWallaceFountain(x, z) {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.62, 0.85, 8), matParkBench);
    base.position.set(x, 0.55, z);
    envGroup.add(base);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, 1.35, 8), matParkBench);
    body.position.set(x, 1.65, z);
    envGroup.add(body);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.52, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), matParkBench);
    dome.position.set(x, 2.32, z);
    envGroup.add(dome);
  }

  // A. Parvis de la Tour Eiffel, Mur de Verre périmétrique, Jardins romantiques & Carrousel de la Tour Eiffel
  addBox(234, 0.26, 220, 0, -0.01, -11, matGravelTex, { cast: false, parent: envGroup });
  addBox(128, 0.12, 128, 0, 0.12, 0, matGranite, { cast: false, parent: envGroup });
  // Dallage central étoilé en granit clair sous le centre exact de la Tour
  const centerDisc = new THREE.Mesh(new THREE.CylinderGeometry(24, 24.4, 0.08, 32), matStoneLight);
  centerDisc.position.set(0, 0.18, 0);
  centerDisc.receiveShadow = true;
  envGroup.add(centerDisc);

  // Mur de verre transparent de sécurité côté Quai Branly (-106) & côté Champ-de-Mars (+86) + portiques acier
  [-104, 84].forEach((gz) => {
    [-58, 58].forEach((gx) => {
      addBox(74, 2.8, 0.14, gx, 1.5, gz, matSecurityGlass, { cast: false, parent: envGroup });
      for (let p = -36; p <= 36; p += 6) {
        addBox(0.16, 2.95, 0.2, gx + p, 1.55, gz, matLampPost, { cast: false, parent: envGroup });
      }
    });
    // Portiques d'entrée latéraux en acier corten/fer brun
    [-19, 19].forEach((px) => addBox(0.6, 3.4, 0.6, px, 1.7, gz, matIronBase, { parent: envGroup }));
  });

  // Parterres verts romantiques, bassins à margelles pierre, petits ponts & grottes rocheuses
  [-74, 74].forEach((bx) => {
    addBox(36, 0.18, 176, bx, 0.11, -10, matGrassTex, { cast: false, parent: envGroup });
    addBox(24, 0.42, 46, bx, 0.26, 2, matStoneLight, { parent: envGroup });
    addBox(20, 0.22, 42, bx, 0.42, 2, matWater, { cast: false, parent: envGroup });
    // Petite passerelle romantique sur chaque bassin + massif rocheux
    addBox(23.5, 0.35, 3.2, bx, 0.72, 2, matIronDark, { parent: envGroup });
    const grotto = new THREE.Mesh(new THREE.DodecahedronGeometry(3.4, 0), matGranite);
    grotto.scale.set(1.2, 0.72, 1.3);
    grotto.position.set(bx + (bx > 0 ? 5.5 : -5.5), 1.4, -14);
    envGroup.add(grotto);
  });

  // 4 Fontaines Wallace autour du Parvis & du Champ-de-Mars
  [[-46, -92], [46, -92], [-44, 154], [44, 154]].forEach(([wx, wz]) => addWallaceFountain(wx, wz));

  // Le célèbre Carrousel de la Tour Eiffel (coin Quai Branly / Pont d'Iéna, x = -56, z = -114) !
  {
    const carG = new THREE.Group();
    carG.position.set(-56, 0.14, -114);
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(6.8, 7.1, 0.65, 24), matStoneLight);
    deck.position.y = 0.32;
    carG.add(deck);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 4.4, 12), matWarmInterior);
    core.position.y = 2.85;
    carG.add(core);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.2, 6), matGold);
      pole.position.set(Math.cos(a) * 5.6, 2.75, Math.sin(a) * 5.6);
      carG.add(pole);
      // Chevaux de bois dorés/blancs
      const horse = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.85, 1.35), k % 2 === 0 ? matStoneLight : matGold);
      horse.position.set(Math.cos(a) * 4.5, 1.85 + (k % 2) * 0.35, Math.sin(a) * 4.5);
      horse.rotation.y = -a;
      carG.add(horse);
    }
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(7.4, 3.2, 24), matCarouselCanopy);
    canopy.position.y = 6.45;
    carG.add(canopy);
    const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.35, 1.6, 8), matGold);
    finial.position.y = 8.7;
    carG.add(finial);
    envGroup.add(carG);
  }

  // B. Réseau routier maillé Rive Gauche
  addAvenueRoad(16, 874, -126, 0.22, 310.5, false);
  addAvenueRoad(16, 874, +126, 0.22, 310.5, false);
  addAvenueRoad(15, 236, 0, 0.22, 106, true);
  addAvenueRoad(15, 96, -70, 0.22, 420, true);
  addAvenueRoad(15, 96, +70, 0.22, 420, true);
  addAvenueRoad(18, 360, 0, 0.22, 756, true);
  addAvenueRoad(16, 112, -188, 0.22, 812, false);
  addAvenueRoad(16, 112, +188, 0.22, 812, false);
  addAvenueRoad(16, 376, 0, 0.22, 868, true);

  addIntersectionPad(34, 15, 0, -133.5);
  addCrosswalk(0, -123, 9, true);
  addCrosswalk(-22, -133.5, 7, false);
  addCrosswalk(+22, -133.5, 7, false);

  [-126, 126].forEach((cx) => {
    addIntersectionPad(22, 15, cx, -133.5);
    addCrosswalk(cx, -123, 7, true);
    addCrosswalk(cx - 13, -133.5, 7, false);
    addCrosswalk(cx + 13, -133.5, 7, false);

    [106, 420, 756].forEach((cz) => {
      addIntersectionPad(16.4, cz === 756 ? 18.4 : 16.4, cx, cz);
      addCrosswalk(cx > 0 ? cx - 12 : cx + 12, cz, 7, false);
      addCrosswalk(cx, cz - 11.5, 7, true);
      if (cz !== 756) addCrosswalk(cx, cz + 11.5, 7, true);
    });
  });
  [-188, 188].forEach((cx) => {
    addIntersectionPad(16.4, 18.4, cx, 756);
    addIntersectionPad(16.4, 16.4, cx, 868);
  });

  // Boucle Rive Droite : Avenue de New-York <-> Place de Varsovie <-> Trocadéro <-> Chaillot
  addIntersectionPad(34, 21, 0, -309.5);
  addCrosswalk(-22, -306.5, 7, false);
  addCrosswalk(+22, -306.5, 7, false);
  addCrosswalk(0, -317, 9, true);

  addAvenueRoad(15, 170, -109, 0.22, -340, true);
  addAvenueRoad(15, 170, +109, 0.22, -340, true);
  const varsovieRing = new THREE.Mesh(new THREE.RingGeometry(13, 26, 36), matAsphaltPlain);
  varsovieRing.rotation.x = -Math.PI * 0.5;
  varsovieRing.position.set(0, 0.296, -340);
  varsovieRing.receiveShadow = true;
  envGroup.add(varsovieRing);
  const varsoviePlinth = new THREE.Mesh(new THREE.CylinderGeometry(13.2, 13.4, 0.22, 32), matStoneLight);
  varsoviePlinth.position.set(0, 0.21, -340);
  envGroup.add(varsoviePlinth);
  const varsovieCenter = new THREE.Mesh(new THREE.CircleGeometry(13, 32), matGrassTex);
  varsovieCenter.rotation.x = -Math.PI * 0.5;
  varsovieCenter.position.set(0, 0.33, -340);
  envGroup.add(varsovieCenter);
  addBox(376, 0.14, 24, 0, 0.05, -323, matGravelTex, { cast: false, parent: envGroup });
  [-1, 1].forEach((side) => {
    addBox(156, 0.18, 15, side * 109, 0.14, -323, matGrassTex, { cast: false, parent: envGroup });
  });

  addAvenueRoad(16, 261.5, -196, 0.22, -437.25, false);
  addAvenueRoad(16, 261.5, +196, 0.22, -437.25, false);
  addAvenueRoad(16, 170, -109, 0.22, -568, true);
  addAvenueRoad(16, 170, +109, 0.22, -568, true);

  const trocaderoRing = new THREE.Mesh(new THREE.RingGeometry(14, 28, 36), matAsphaltPlain);
  trocaderoRing.rotation.x = -Math.PI * 0.5;
  trocaderoRing.position.set(0, 0.296, -568);
  trocaderoRing.receiveShadow = true;
  envGroup.add(trocaderoRing);
  const trocaderoCenter = new THREE.Mesh(new THREE.CircleGeometry(14, 32), matGrassTex);
  trocaderoCenter.rotation.x = -Math.PI * 0.5;
  trocaderoCenter.position.set(0, 0.33, -568);
  envGroup.add(trocaderoCenter);
  addBox(4.2, 2.8, 4.2, 0, 1.7, -568, matStoneLight, { parent: envGroup });
  addClassicalGoldStatue(0, 3.1, -568, 1.15, 0, true); // Statue équestre du Maréchal Foch !

  [-196, 196].forEach((cx) => {
    addIntersectionPad(18, 15, cx, -306.5);
    addCrosswalk(cx - 12, -306.5, 7, false);
    addCrosswalk(cx + 12, -306.5, 7, false);
    addCrosswalk(cx, -317, 7, true);
    addIntersectionPad(18, 16.4, cx, -340);
    addCrosswalk(cx > 0 ? cx - 12 : cx + 12, -340, 7, false);
    addIntersectionPad(18, 17, cx, -568);
    addCrosswalk(cx > 0 ? cx - 12 : cx + 12, -568, 7, false);
    addCrosswalk(cx, -557, 7, true);
  });

  // C. Champ-de-Mars détaillé (z = +114 .. +745)
  addBox(234, 0.24, 636, 0, 0.02, 430, matGravelTex, { cast: false, parent: envGroup });
  [194, 326, 514, 646].forEach((cz) => {
    const len = cz === 194 || cz === 646 ? 128 : 102;
    addBox(68, 0.08, len + 2.4, 0, 0.15, cz, matStoneLight, { cast: false, parent: envGroup });
    addBox(64, 0.12, len, 0, 0.19, cz, matGrassTex, { cast: false, parent: envGroup });
  });
  [-62, 62].forEach((px) => {
    [230, 610].forEach((pz) => {
      addBox(30, 0.12, 165, px, 0.16, pz, matGrassTex, { cast: false, parent: envGroup });
    });
  });

  // Rond-point central du Champ-de-Mars (z = +420) avec bassin fleuri
  const cdmPlinth = new THREE.Mesh(new THREE.CylinderGeometry(20, 21, 0.48, 28), matStoneLight);
  cdmPlinth.position.set(0, 0.26, 420);
  cdmPlinth.receiveShadow = true;
  envGroup.add(cdmPlinth);
  const cdmBasinWater = new THREE.Mesh(new THREE.CylinderGeometry(17.5, 17.5, 0.22, 28), matWater);
  cdmBasinWater.position.set(0, 0.44, 420);
  envGroup.add(cdmBasinWater);
  const cdmFountainPedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.2, 2.8, 12), matStoneLight);
  cdmFountainPedestal.position.set(0, 1.5, 420);
  envGroup.add(cdmFountainPedestal);
  const cdmBasinCup = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 1.4, 0.85, 16), matStoneLight);
  cdmBasinCup.position.set(0, 2.85, 420);
  envGroup.add(cdmBasinCup);

  // Kiosque à Musique octogonal du Champ-de-Mars (x = +62, z = +300)
  const kiosk = new THREE.Group();
  kiosk.position.set(62, 0.14, 300);
  envGroup.add(kiosk);
  const kioskBase = new THREE.Mesh(new THREE.CylinderGeometry(7.2, 7.6, 1.4, 8), matStoneLight);
  kioskBase.position.y = 0.7;
  kiosk.add(kioskBase);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 4.2, 6), matParkBench);
    col.position.set(Math.cos(a) * 6.2, 3.5, Math.sin(a) * 6.2);
    kiosk.add(col);
  }
  const kioskRoof = new THREE.Mesh(new THREE.ConeGeometry(8.0, 3.4, 8), matSlateRoof);
  kioskRoof.position.y = 7.2;
  kiosk.add(kioskRoof);

  // Arbres parisiens multi-houppiers (Champ-de-Mars + jardins de la Tour + Trocadéro)
  const treeCoords = [];
  for (let tz = 135; tz <= 720; tz += 30) {
    if (Math.abs(tz - 420) < 26) continue;
    treeCoords.push([-48, tz], [48, tz], [-78, tz], [78, tz], [-104, tz], [104, tz]);
  }
  for (let jz = -94; jz <= 82; jz += 28) {
    treeCoords.push([-96, jz], [96, jz]);
  }
  for (let tz = -475; tz <= -375; tz += 25) {
    treeCoords.push([-48, tz], [48, tz], [-82, tz], [82, tz], [-112, tz], [112, tz], [-146, tz], [146, tz]);
  }

  const treeTrunkGeo = new THREE.CylinderGeometry(0.28, 0.45, 5.2, 7);
  const treeCrownGeo = new THREE.IcosahedronGeometry(3.4, 1);
  const matTrunk = new THREE.MeshStandardMaterial({ color: 0x4f3d2e, roughness: 0.92 });
  const matLeaf = new THREE.MeshStandardMaterial({ color: 0x466d36, roughness: 0.86 });
  const trunksInst = new THREE.InstancedMesh(treeTrunkGeo, matTrunk, treeCoords.length);
  const crownsInst = new THREE.InstancedMesh(treeCrownGeo, matLeaf, treeCoords.length * 3);
  const td = new THREE.Object3D();
  const cTint = new THREE.Color();
  treeCoords.forEach(([tx, tz], idx) => {
    const jitter = ((idx * 37) % 10) * 0.08;
    const hScale = 0.85 + ((idx * 53) % 7) * 0.07;
    td.position.set(tx, 2.6 * hScale, tz);
    td.rotation.set(0, 0, 0);
    td.scale.set(1, hScale, 1);
    td.updateMatrix();
    trunksInst.setMatrixAt(idx, td.matrix);

    const offsets = [[0, 7.6 * hScale, 0, 1.18], [-1.7, 6.5 * hScale, 1.2, 0.85], [1.6, 6.7 * hScale, -1.1, 0.88]];
    offsets.forEach(([ox, oy, oz, s], subIdx) => {
      td.position.set(tx + ox, oy, tz + oz);
      td.scale.set(s * (1 + jitter * 0.15), s * 0.86, s);
      td.updateMatrix();
      const ci = idx * 3 + subIdx;
      crownsInst.setMatrixAt(ci, td.matrix);
      const shade = 0.84 + ((ci * 29) % 16) * 0.018;
      cTint.setRGB(shade * 0.92, shade * 1.05, shade * 0.78);
      crownsInst.setColorAt(ci, cTint);
    });
  });
  trunksInst.instanceMatrix.needsUpdate = true;
  crownsInst.instanceMatrix.needsUpdate = true;
  if (crownsInst.instanceColor) crownsInst.instanceColor.needsUpdate = true;
  envGroup.add(trunksInst, crownsInst);

  // Bancs Davioud & réverbères parisiens le long des allées
  const benchPositions = [];
  const lampPositions = [];
  for (let bz = 150; bz <= 710; bz += 55) {
    if (Math.abs(bz - 420) < 28) continue;
    benchPositions.push([-40, bz, Math.PI * 0.5], [40, bz, -Math.PI * 0.5]);
    lampPositions.push([-42, 0.14, bz + 18], [42, 0.14, bz + 18]);
  }
  const benchSeatGeo = new THREE.BoxGeometry(2.4, 0.18, 0.65);
  const benchInst = new THREE.InstancedMesh(benchSeatGeo, matParkBench, benchPositions.length * 2);
  benchPositions.forEach(([bx, bz, rotY], i) => {
    td.rotation.set(0, rotY, 0);
    td.scale.set(1, 1, 1);
    td.position.set(bx, 0.58, bz);
    td.updateMatrix();
    benchInst.setMatrixAt(i * 2, td.matrix);
    td.position.set(bx + (rotY > 0 ? -0.28 : 0.28), 0.98, bz);
    td.rotation.set(0, rotY, 0);
    td.updateMatrix();
    benchInst.setMatrixAt(i * 2 + 1, td.matrix);
  });
  benchInst.instanceMatrix.needsUpdate = true;
  envGroup.add(benchInst);

  [-288, -254, -220, -186, -152].forEach((pz) => {
    const ly = yPontIena(pz) + 0.14;
    lampPositions.push([-15.4, ly, pz], [15.4, ly, pz]);
  });
  [-485, -455, -425, -395, -370].forEach((tz) => {
    lampPositions.push([-22, 0.35, tz], [22, 0.35, tz]);
  });

  const lampPoleGeo = new THREE.CylinderGeometry(0.11, 0.18, 4.6, 6);
  const lampGlobeGeo = new THREE.SphereGeometry(0.42, 10, 8);
  const polesInst = new THREE.InstancedMesh(lampPoleGeo, matLampPost, lampPositions.length);
  const globesInst = new THREE.InstancedMesh(lampGlobeGeo, matStreetLampGlow, lampPositions.length);
  lampPositions.forEach(([lx, ly, lz], i) => {
    td.rotation.set(0, 0, 0);
    td.scale.set(1, 1, 1);
    td.position.set(lx, ly + 2.3, lz);
    td.updateMatrix();
    polesInst.setMatrixAt(i, td.matrix);
    td.position.set(lx, ly + 4.75, lz);
    td.updateMatrix();
    globesInst.setMatrixAt(i, td.matrix);
  });
  polesInst.instanceMatrix.needsUpdate = true;
  globesInst.instanceMatrix.needsUpdate = true;
  envGroup.add(polesInst, globesInst);

  // Immeubles haussmanniens 3D détaillés encadrant Parvis/Suffren/Bourdonnais (±156) & Trocadéro (±220 / -604)
  const addHaussmannFacadeBlock = (hx, hz, depthZ, hHeight, sideFacing, matF, faceIsZ = false) => {
    if (!faceIsZ) {
      addBox(22, hHeight, depthZ, hx, hHeight * 0.5, hz, matF, { parent: envGroup });
      const faceX = hx - sideFacing * 11.4;
      addBox(0.9, 0.35, depthZ + 0.4, faceX, hHeight * 0.36, hz, matStoneLight, { cast: false, parent: envGroup });
      addBox(0.9, 0.35, depthZ + 0.4, faceX, hHeight * 0.78, hz, matStoneLight, { cast: false, parent: envGroup });
      const mansard = addBox(20.2, 4.2, depthZ - 1.6, hx, hHeight + 2.1, hz, matSlateRoof, { parent: envGroup });
      mansard.receiveShadow = true;
      [-depthZ * 0.32, 0, depthZ * 0.32].forEach((cz) => {
        addBox(1.8, 2.2, 1.4, hx, hHeight + 4.8, hz + cz, matStone, { cast: false, parent: envGroup });
      });
    } else {
      addBox(depthZ, hHeight, 22, hx, hHeight * 0.5, hz, matF, { parent: envGroup });
      const faceZ = hz - sideFacing * 11.4;
      addBox(depthZ + 0.4, 0.35, 0.9, hx, hHeight * 0.36, faceZ, matStoneLight, { cast: false, parent: envGroup });
      addBox(depthZ + 0.4, 0.35, 0.9, hx, hHeight * 0.78, faceZ, matStoneLight, { cast: false, parent: envGroup });
      const mansard = addBox(depthZ - 1.6, 4.2, 20.2, hx, hHeight + 2.1, hz, matSlateRoof, { parent: envGroup });
      mansard.receiveShadow = true;
      [-depthZ * 0.32, 0, depthZ * 0.32].forEach((cx) => {
        addBox(1.4, 2.2, 1.8, hx + cx, hHeight + 4.8, hz, matStone, { cast: false, parent: envGroup });
      });
    }
  };

  [-76, 18].forEach((hz, rIdx) => {
    [-1, 1].forEach((side, sIdx) => {
      addHaussmannFacadeBlock(side * 156, hz, 58, 22.8 + ((rIdx + sIdx) % 2) * 1.4, side, haussFacadeMats[(rIdx + sIdx) % 3]);
    });
  });
  for (let row = 0; row < 9; row++) {
    const hz = 166 + row * 66;
    if (Math.abs(hz - 420) < 34) continue;
    [-1, 1].forEach((side, sIdx) => {
      const hHeight = 22.5 + ((row + sIdx) % 3) * 1.4;
      addHaussmannFacadeBlock(side * 156, hz, 56, hHeight, side, haussFacadeMats[(row + sIdx) % haussFacadeMats.length]);
    });
  }
  [-382, -456, -530].forEach((hz, rIdx) => {
    [-1, 1].forEach((side, sIdx) => {
      addHaussmannFacadeBlock(side * 220, hz, 56, 22.2 + ((rIdx + sIdx) % 3) * 1.2, side, haussFacadeMats[(rIdx + sIdx + 1) % 3]);
    });
  });
  [-118, 0, 118].forEach((hx, idx) => {
    addHaussmannFacadeBlock(hx, -604, 68, 23.0 + (idx % 2) * 1.4, -1, haussFacadeMats[idx % 3], true);
  });

  // D. École Militaire haute fidélité fermant la perspective Sud-Est (z = +812)
  const ecoleM = new THREE.Group();
  ecoleM.position.set(0, 0, 812);
  envGroup.add(ecoleM);
  addBox(120, 0.16, 48, 0, 0.08, -32, matGranite, { cast: false, parent: ecoleM });
  [-48, -16, 16, 48].forEach((px) => {
    addBox(1.8, 5.2, 1.8, px, 2.6, -54, matStoneLight, { parent: ecoleM });
    const urn = new THREE.Mesh(new THREE.SphereGeometry(0.75, 8, 8), matGold);
    urn.position.set(px, 5.65, -54);
    ecoleM.add(urn);
  });
  addBox(98, 2.8, 0.25, 0, 1.5, -54, matLampPost, { parent: ecoleM });
  addBox(216, 25, 36, 0, 12.5, 0, haussFacadeMats[0], { parent: ecoleM });
  addBox(212, 5.5, 32, 0, 27.5, 0, matSlateRoof, { parent: ecoleM });
  addBox(48, 31, 44, 0, 15.5, -2, matStoneLight, { parent: ecoleM });
  for (let ci = 0; ci < 8; ci++) {
    const cx = -17.5 + ci * 5.0;
    const colMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 18.5, 10), matStoneLight);
    colMesh.position.set(cx, 13.5, -25.2);
    colMesh.castShadow = true;
    ecoleM.add(colMesh);
  }
  // Fronton triangulaire sculpté + horloge dorée du Pavillon de l'Horloge
  const emPedShape = new THREE.Shape();
  emPedShape.moveTo(-22, 0);
  emPedShape.lineTo(22, 0);
  emPedShape.lineTo(0, 7.2);
  emPedShape.closePath();
  const emPedMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(emPedShape, { depth: 3.2, bevelEnabled: false }), matStoneLight);
  emPedMesh.position.set(0, 23.6, -26.5);
  ecoleM.add(emPedMesh);
  const emClock = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.45, 16), matGold);
  emClock.rotation.x = Math.PI * 0.5;
  emClock.position.set(0, 26.8, -26.8);
  ecoleM.add(emClock);
  const emDome = new THREE.Mesh(new THREE.CylinderGeometry(6, 19, 14, 4), matSlateRoof);
  emDome.position.set(0, 38, -2);
  emDome.rotation.y = Math.PI * 0.25;
  ecoleM.add(emDome);
  const emLantern = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.8, 6.5, 8), matGold);
  emLantern.position.set(0, 47.5, -2);
  ecoleM.add(emLantern);

  // E. Pont d'Iéna (5 arches, Aigles impériaux dorés sur les piles & 4 Cavaliers sculptés)
  const bridgeSegs = 9;
  const bridgeStep = 160 / bridgeSegs;
  for (let i = 0; i < bridgeSegs; i++) {
    const zA = -140 - i * bridgeStep;
    const zB = -140 - (i + 1) * bridgeStep;
    const yA = yPontIena(zA);
    const yB = yPontIena(zB);
    const zMid = (zA + zB) * 0.5;
    const yMid = (yA + yB) * 0.5;
    const segLen = Math.hypot(zA - zB, yB - yA) + 0.35;
    const rx = Math.atan2(yB - yA, zA - zB);

    const bStone = addBox(35.5, 0.95, segLen, 0, yMid - 0.52, zMid, matStone, { parent: envGroup });
    bStone.rotation.x = rx;
    const bRoad = addBox(26.4, 0.14, segLen, 0, yMid - 0.06, zMid, matAsphaltPlain, { cast: false, parent: envGroup });
    bRoad.rotation.x = rx;
    [-15.0, 15.0].forEach((sx) => {
      const bWalk = addBox(3.6, 0.22, segLen, sx, yMid + 0.04, zMid, matStoneLight, { cast: false, parent: envGroup });
      bWalk.rotation.x = rx;
    });
    [-17.1, 17.1].forEach((px) => {
      const bWall = addBox(0.95, 1.05, segLen, px, yMid + 0.62, zMid, matStoneLight, { parent: envGroup });
      bWall.rotation.x = rx;
    });
  }

  [-294, -264.4, -234.8, -205.2, -175.6, -146].forEach((pz, pIdx) => {
    const topY = yPontIena(pz) - 0.35;
    const botY = -5.8;
    const hPier = topY - botY;
    addBox(37.5, hPier, 5.4, 0, (topY + botY) * 0.5, pz, matStone, { parent: envGroup });
    const cutH = Math.max(2.6, topY - 0.2 - botY);
    [-19.8, 19.8].forEach((cx) => {
      const cutwater = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 2.7, cutH, 3), matStoneLight);
      cutwater.position.set(cx, botY + cutH * 0.5, pz);
      cutwater.rotation.y = cx > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
      envGroup.add(cutwater);
      // Médaillons d'Aigles Impériaux dorés sur les 4 piles centrales
      if (pIdx > 0 && pIdx < 5) {
        const eagle = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.35, 12), matGold);
        eagle.rotation.z = Math.PI * 0.5;
        eagle.position.set(cx > 0 ? 19.2 : -19.2, topY - 1.35, pz);
        envGroup.add(eagle);
      }
    });
  });

  [-279.2, -249.6, -220.0, -190.4, -160.8].forEach((az) => {
    const archBaseY = -0.85;
    const rise = Math.max(1.2, yPontIena(az) - 0.22 - archBaseY);
    const radius = 26 * 0.44;
    [-17.8, 17.8].forEach((sx) => {
      const archRing = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.75, 8, 18, Math.PI), matStoneLight);
      archRing.rotation.y = Math.PI * 0.5;
      archRing.scale.set(1.0, rise / radius, 1.0);
      archRing.position.set(sx, archBaseY, az);
      envGroup.add(archRing);
    });
  });

  // 4 Cavaliers monumentaux sculptés aux entrées du Pont d'Iéna
  [[-16.2, -142, Math.PI], [16.2, -142, Math.PI], [-16.2, -298, 0], [16.2, -298, 0]].forEach(([sx, sz, rY]) => {
    addBox(3.8, 3.8, 4.4, sx, 2.2, sz, matStoneLight, { parent: envGroup });
    addClassicalGoldStatue(sx, 4.1, sz, 1.05, rY, true);
  });

  // F. Jardins du Trocadéro, Bassin de Varsovie (16 jets animés en 1 InstancedMesh !), Parvis & Palais de Chaillot
  addBox(376, 0.24, 212, 0, 0.08, -454, matGravelTex, { cast: false, parent: envGroup });
  [-74, 74].forEach((gx) => {
    addBox(86, 0.34, 108, gx, 0.3, -428, matGrassTex, { cast: false, parent: envGroup });
    addBox(80, 0.65, 62, gx, 0.72, -456, matGrassTex, { cast: false, parent: envGroup });
  });
  [-152, 152].forEach((gx) => {
    addBox(48, 0.3, 104, gx, 0.26, -410, matGrassTex, { cast: false, parent: envGroup });
  });

  addBox(33, 1.0, 104, 0, 0.45, -425, matStoneLight, { parent: envGroup });
  addBox(28.5, 0.32, 99.5, 0, 0.85, -425, matWater, { cast: false, parent: envGroup });
  for (let st = 0; st < 4; st++) {
    addBox(28 - st * 1.5, 0.9, 5, 0, 1.2 + st * 0.85, -478 - st * 4.5, matStoneLight, { parent: envGroup });
    addBox(24 - st * 1.5, 0.22, 4.4, 0, 1.65 + st * 0.85, -478 - st * 4.5, matWater, { cast: false, parent: envGroup });
  }
  [[-18, -380], [18, -380], [-18, -468], [18, -468]].forEach(([sx, sz]) => {
    addBox(3.4, 2.2, 3.4, sx, 1.25, sz, matStoneLight, { parent: envGroup });
    addClassicalGoldStatue(sx, 2.35, sz, 1.15, sx > 0 ? -Math.PI * 0.5 : Math.PI * 0.5, false);
  });

  // 16 canons à eau animés du Bassin de Varsovie regroupés en 1 SEUL InstancedMesh (économise 15 draw calls !)
  const matTrocaderoJet = new THREE.MeshStandardMaterial({
    color: 0xe6f6ff,
    emissive: new THREE.Color(0x8cd9ff),
    emissiveIntensity: 0.12,
    transparent: true,
    opacity: 0.62,
    roughness: 0.15,
  });
  const jetSpecs = [];
  for (let ji = 0; ji < 8; ji++) {
    const jz = -464 + ji * 10.5;
    [-6.5, 6.5].forEach((jx, sIdx) => {
      jetSpecs.push({ x: jx, z: jz, rotZ: jx > 0 ? 0.18 : -0.18, phase: ji * 0.55 + sIdx * 1.2 });
    });
  }
  const trocaderoJetsInst = new THREE.InstancedMesh(new THREE.ConeGeometry(0.95, 13.5, 8), matTrocaderoJet, jetSpecs.length);
  trocaderoJetsInst.userData.noMerge = true;
  envGroup.add(trocaderoJetsInst);

  // Deux grands escaliers monumentaux de pierre menant au Parvis des Droits de l'Homme
  for (let s = 0; s < 12; s++) {
    const sy = 1.1 + s * 1.05;
    const sz = -468 - s * 2.3;
    [-33, 33].forEach((sx) => {
      addBox(16, 1.2, 2.6, sx, sy, sz, matStoneLight, { cast: false, parent: envGroup });
    });
  }

  // Parvis des Droits de l'Homme (z = -512, y = 13,5 m) & 8 statues classiques dorées sculptées
  addBox(190, 14.5, 48, 0, 6.25, -512, matStoneLight, { parent: envGroup });
  addBox(186, 1.0, 1.2, 0, 14.0, -489, matStone, { parent: envGroup });
  [-58, -48, -38, -28, 28, 38, 48, 58].forEach((sx) => {
    addBox(2.2, 2.2, 2.2, sx, 14.6, -492, matStone, { parent: envGroup });
    addClassicalGoldStatue(sx, 15.7, -492, 1.12, 0, false);
  });

  // Palais de Chaillot : 2 pavillons Art Déco monumentaux + colonnade + 2 ailes courbes
  [-1, 1].forEach((side) => {
    addBox(44, 27, 36, side * 56, 27.0, -526, matChaillotTex, { parent: envGroup });
    addBox(46, 2.2, 38, side * 56, 41.2, -526, matStoneLight, { parent: envGroup });
    addBox(46.2, 1.1, 38.2, side * 56, 39.2, -526, matGold, { cast: false, parent: envGroup });
    // Colonnade monumentale sur la façade côté Tour Eiffel
    for (let c = -3; c <= 3; c++) {
      addBox(1.8, 24.5, 2.2, side * 56 + c * 6.0, 26.5, -507.2, matStoneLight, { parent: envGroup });
    }

    const segCount = 6;
    for (let k = 0; k < segCount; k++) {
      const theta = ((k + 0.5) / segCount) * 0.72;
      const arcR = 152;
      const wx = side * (74 + Math.sin(theta) * arcR);
      const wz = -526 + (1 - Math.cos(theta)) * arcR * 1.45;
      const seg = addBox(28, 22, 24, wx, 24.5, wz, matChaillotTex, { parent: envGroup });
      seg.rotation.y = side * -theta * 1.15;
      const baseSeg = addBox(28, 14.5, 24, wx, 6.25, wz, matStoneLight, { parent: envGroup });
      baseSeg.rotation.y = side * -theta * 1.15;
    }
  });
  addBox(260, 0.24, 34, 0, 0.08, -544, matGravelTex, { cast: false, parent: envGroup });

  mergeStaticGroupByMaterial(envGroup);

  /**
   * ==========================================================================
   * 5. HAUTEUR DU SOL VISITABLE (PARVIS + ÉTAGES + PONT D'IÉNA + TROCADÉRO) & POIS
   * ==========================================================================
   */
  const invRot = -EIFFEL_ROT_Y;
  const cosI = Math.cos(invRot);
  const sinI = Math.sin(invRot);

  function getFloorHeightAt(wx, wz, currentY = 1.75) {
    const dx = wx - EIFFEL_WORLD_POS.x;
    const dz = wz - EIFFEL_WORLD_POS.z;
    const lx = dx * cosI + dz * sinI;
    const lz = -dx * sinI + dz * cosI;

    if (currentY > 240 && Math.abs(lx) < 10 && Math.abs(lz) < 10) return 276.0;
    if (currentY > 95 && Math.abs(lx) < 21 && Math.abs(lz) < 21) return 115.7;
    if (currentY > 45 && Math.abs(lx) < 36 && Math.abs(lz) < 36) return 57.6;

    if (Math.abs(lx) < 18 && lz <= -140 && lz >= -300) {
      return yPontIena(lz);
    }
    if (Math.abs(lx) < 92 && lz <= -490 && lz >= -538) return 13.55;
    if (Math.abs(lx) < 100 && Math.abs(lz) < 108) return 0.14;
    return 0.28;
  }

  const introChapter = {
    id: 'eiffel-intro-360',
    title: 'Histoire de la Tour Eiffel — Tour 360°',
    era: '1887 – 1889 • Révolution industrielle',
    location: 'Survol panoramique • Champ-de-Mars, Paris',
    history:
      "Bienvenue devant la Dame de Fer ! Conçue par les ingénieurs Maurice Koechlin et Émile Nouguier dans les ateliers de Gustave Eiffel pour célébrer le centenaire de la Révolution française lors de l'Exposition universelle de 1889, la Tour Eiffel fut bâtie en un temps record de 2 ans, 2 mois et 5 jours.",
    anecdote:
      "Assemblées grâce à 2,5 millions de rivets, ses 18 038 pièces de fer puddlé pèsent 7 300 tonnes. Détestée au départ par certains artistes comme Maupassant ou Zola, elle devint le monument payant le plus visité au monde et culmine aujourd'hui à 330 mètres.",
    voiceover:
      "Bienvenue devant la Tour Eiffel, le symbole absolu de Paris. " +
      "Pendant ce tour panoramique à 360 degrés, plongeons dans l'histoire de sa construction prodigieuse. " +
      "Imaginée pour l'Exposition universelle de 1889, la Tour fut érigée en seulement vingt-six mois par les équipes de Gustave Eiffel, avec dix-huit mille trente-huit pièces de fer puddlé et deux millions et demi de rivets. " +
      "Critiquée à ses débuts par une pétition d'artistes, elle devait être démontée vingt ans plus tard. C'est son utilité scientifique et ses expériences de télégraphie sans fil au sommet qui la sauvèrent définitivement. " +
      "Culminant aujourd'hui à 330 mètres de hauteur face au Trocadéro et au Champ-de-Mars, découvrons ensemble ses sept lieux incontournables.",
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
      id: 'eiffel-parvis-piliers',
      title: 'Le Parvis et les 4 Grands Piliers',
      shortTitle: 'Parvis & 4 Piliers',
      era: '1887 • Fondations & Treillis',
      location: 'Sous la Tour • Envergure 125 m',
      localMarker: [0, 18, 0],
      localCam: [0, 24, -138],
      localTarget: [0, 32, 0],
      localFps: [0, 1.9, -42],
      history:
        "Chaque pilier repose sur quatre massifs de maçonnerie en pierre de taille coiffés de sabots d'ancrage en fonte. Reliés sous le 1er étage par quatre grands arcs ajourés inclinés, ils encadrent un parvis monumental de 125 mètres de côté et le buste doré de Gustave Eiffel.",
      anecdote:
        "Gustave Eiffel fit installer des vérins hydrauliques dans les sabots des 4 piliers lors du montage pour ajuster au millimètre près la jonction parfaite des poutres au 1er étage !",
    }),
    makePoi({
      id: 'eiffel-premier-etage',
      title: 'Le 1er Étage, Plancher de Verre & 72 Savants',
      shortTitle: '1er Étage & 72 Savants',
      era: '57,6 mètres • Frise dorée',
      location: 'Galerie panoramique inférieure',
      localMarker: [0, 62, -33],
      localCam: [-52, 74, -84],
      localTarget: [0, 58, -14],
      localFps: [0, 59.4, -22],
      history:
        "À 57,6 mètres du sol, ce vaste plateau carré de 71 mètres soutenu par des consoles et 56 arcades en fer forgé offre une vue plongeante sur le parvis grâce à son célèbre plancher de verre, tout en abritant Madame Brasserie et les pavillons contemporains inclinés.",
      anecdote:
        "Juste sous la corniche du 1er étage court la frise intégrale des 72 savants (18 noms distincts sur chaque face) : Gustave Eiffel y fit graver en lettres d'or les noms des plus grands scientifiques français (Lavoisier, Ampère, Pasteur, Foucault, Laplace…).",
    }),
    makePoi({
      id: 'eiffel-ascenseurs',
      title: 'Les Ascenseurs Historiques inclinés',
      shortTitle: 'Ascenseurs 1889',
      era: '1889 • Génie hydraulique',
      location: 'Piliers Est, Ouest & Nord',
      localMarker: [-35, 36, 35],
      localCam: [-78, 42, 66],
      localTarget: [-35, 36, 35],
      localFps: [-54, 1.9, 54],
      history:
        "Pour gravir les piliers courbes sans escalier central, les ingénieurs durent inventer des ascenseurs capables de changer d'inclinaison en cours de trajet ! Ces cabines vitrées à impériale reposent sur des bogies articulés afin de garder leur plancher parfaitement horizontal du sol jusqu'au 2e étage.",
      anecdote:
        "Les machineries hydrauliques d'origine des piliers Est et Ouest fonctionnent encore selon le principe imaginé en 1889 : observe bien le chariot incliné pivoter doucement sous la cabine pendant la montée !",
    }),
    makePoi({
      id: 'eiffel-deuxieme-etage',
      title: 'Le 2e Étage & Le Jules Verne',
      shortTitle: '2e Étage (115,7 m)',
      era: '115,7 mètres • Panorama Paris',
      location: 'Double galerie du 2e niveau',
      localMarker: [0, 122, -18],
      localCam: [-48, 132, -68],
      localTarget: [0, 118, 0],
      localFps: [0, 117.5, -18],
      history:
        "Perché à 115,7 mètres avec ses deux plateaux superposés et sa ceinture d'arcades ajourées, le deuxième étage offre le point d'observation idéal sur tout Paris, juste là où les quatre piliers fusionnent dans l'élancée verticale du fût central.",
      anecdote:
        "C'est ici que siège le célèbre restaurant gastronomique Le Jules Verne, et c'est depuis cette hauteur que le 1er et le 2e étage fusionnent visuellement vers l'élancée verticale du fût.",
    }),
    makePoi({
      id: 'eiffel-sommet',
      title: 'Le Sommet & Bureau de Gustave Eiffel',
      shortTitle: 'Sommet (276 – 330 m)',
      era: '276 à 330 mètres • Phare & Radio',
      location: 'Cime de la Tour Eiffel',
      localMarker: [0, 286, 0],
      localCam: [-44, 294, -52],
      localTarget: [0, 292, 0],
      localFps: [0, 277.8, -7],
      history:
        "Soutenu par son chapiteau en consoles courbes à 276 mètres, le Sommet abrite le bureau vitré de Gustave Eiffel, le Bar à Champagne, le campanile octogonal Beaux-Arts, le phare marin Fresnel rotatif et le mât treillis culminant à exactement 330 mètres.",
      anecdote:
        "Passe le curseur solaire sur 21h00 : la Tour s'embrase d'or, ses milliers d'éclats étoilés scintillent dans la nuit parisienne et son double faisceau lumineux balaie Paris sur plusieurs kilomètres !",
    }),
    makePoi({
      id: 'eiffel-champ-de-mars',
      title: 'Le Champ-de-Mars & L’École Militaire',
      shortTitle: 'Champ-de-Mars',
      era: '1765 / 1889 • Grande perspective',
      location: 'Esplanade Sud-Est',
      localMarker: [0, 14, 290],
      localCam: [68, 72, 540],
      localTarget: [0, 82, 110],
      localFps: [0, 1.9, 320],
      history:
        "Ancien terrain de manœuvres de l'École Militaire dessiné au XVIIIe siècle par Gabriel, le Champ-de-Mars a accueilli cinq Expositions universelles parisiennes entre 1867 et 1937. Ses vastes pelouses offrent aujourd'hui la grande perspective verte au pied de la Dame de Fer.",
      anecdote:
        "Le 14 juillet 1790, plus de 300 000 Parisiens s'y rassemblèrent pour célébrer la Fête de la Fédération au pied de l'Autel de la Patrie.",
    }),
    makePoi({
      id: 'eiffel-trocadero-iena',
      title: 'Le Pont d’Iéna & Le Trocadéro',
      shortTitle: 'Pont d’Iéna & Trocadéro',
      era: '1814 / 1937 • Palais de Chaillot',
      location: 'Rive Droite • Bassin de Varsovie',
      localMarker: [0, 16, -425],
      localCam: [-68, 56, -535],
      localTarget: [0, 125, -30],
      localFps: [0, 15.3, -502],
      history:
        "Dans l'axe rigoureux de la Tour Eiffel, le Pont d'Iéna à cinq arches — orné de ses Aigles impériaux et de ses quatre Cavaliers — enjambe la Seine vers les Jardins du Trocadéro, les seize canons à eau du Bassin de Varsovie et les colonnades du Palais de Chaillot (1937).",
      anecdote:
        "Le Parvis des Droits de l'Homme, bordé de ses statues dorées au sommet des escaliers du Trocadéro, constitue le point de vue le plus célèbre au monde pour embrasser d'un seul regard toute la silhouette de la Tour Eiffel.",
    }),
  ];

  /**
   * ==========================================================================
   * 6. BOUCLE D'ANIMATION : ASCENSEURS, FONTAINES INSTANCIÉES, SCINTILLEMENT & PHARE
   * ==========================================================================
   */
  let elapsed = 0;
  let currentLod = 0;
  const jetDummy = new THREE.Object3D();

  function setLodLevel(level, camDist = 200) {
    currentLod = level;
    envGroup.visible = camDist < 2600;
    elevatorGroup.visible = level < 2;
    const showMicro = level === 0;
    benchInst.visible = showMicro;
    polesInst.visible = showMicro;
    globesInst.visible = showMicro;
    inclinedElevators.forEach((el) => { el.carriage.visible = showMicro; });
    verticalElevators.forEach((el) => { el.mesh.visible = showMicro; });
    trocaderoJetsInst.visible = level < 2;
  }

  function update(dt, nightFactor = 0.1, _sunDir = null) {
    const clampedDt = Math.min(dt, 0.05);
    elapsed += clampedDt;

    if (currentLod === 0) {
      inclinedElevators.forEach((el) => {
        const cy01 = computeElevatorCycle01(elapsed * 0.024 + el.phase / (Math.PI * 2));
        const y = 5.4 + cy01 * 106.6;
        const prof = sampleTowerProfile(y);
        el.carriage.position.set(el.sx * prof.centerSpan, y, el.sz * prof.centerSpan);

        const yA = Math.max(0, y - 1.0);
        const yB = Math.min(115.7, y + 1.0);
        const dInward = (sampleTowerProfile(yA).centerSpan - sampleTowerProfile(yB).centerSpan) * Math.SQRT2;
        el.bogie.rotation.x = Math.atan2(dInward, yB - yA);
      });

      verticalElevators.forEach((el) => {
        const cy01 = (Math.sin(elapsed * 0.16 + el.phase) * 0.5 + 0.5);
        el.mesh.position.y = 118.5 + cy01 * 151.0;
      });
    }

    // Animation des 16 jets d'eau du Bassin de Varsovie (1 seul InstancedMesh !)
    if (currentLod < 2 && envGroup.visible) {
      for (let i = 0; i < jetSpecs.length; i++) {
        const jet = jetSpecs[i];
        const sY = 0.72 + 0.34 * Math.sin(elapsed * 2.4 + jet.phase);
        jetDummy.position.set(jet.x, 0.85 + 6.4 * sY, jet.z);
        jetDummy.rotation.set(0.28, 0, jet.rotZ);
        jetDummy.scale.set(1, sY, 1);
        jetDummy.updateMatrix();
        trocaderoJetsInst.setMatrixAt(i, jetDummy.matrix);
      }
      trocaderoJetsInst.instanceMatrix.needsUpdate = true;
    }

    // Illumination dorée nocturne, balises aéronautiques, cabines & phare marin Fresnel
    const glow = Math.max(0, (nightFactor - 0.28) / 0.72);
    const isNightGlow = glow > 0.02;

    ironMaterials.forEach((mat) => {
      mat.emissive.setHex(0xd99238);
      mat.emissiveIntensity = glow * 0.64;
    });
    matIronDark.emissive.setHex(0xb87428);
    matIronDark.emissiveIntensity = glow * 0.42;
    matWarmInterior.emissiveIntensity = 0.28 + glow * 1.45;
    matBeaconLens.emissiveIntensity = 0.45 + glow * 2.4;
    matElevInteriorGlow.emissiveIntensity = 0.55 + glow * 1.25;
    matStreetLampGlow.emissiveIntensity = 0.22 + glow * 1.45;
    matTrocaderoJet.emissiveIntensity = 0.12 + glow * 0.95;

    const pulse = 0.55 + 0.45 * Math.sin(elapsed * 3.8);
    matAviationRed.emissiveIntensity = 0.65 + pulse * (0.9 + glow * 1.6);

    const useTowerPointLights = currentLod === 0 && glow > 0.04;
    towerNightLights[0].visible = useTowerPointLights;
    towerNightLights[1].visible = useTowerPointLights;
    if (useTowerPointLights) {
      towerNightLights[0].intensity = glow * 115;
      towerNightLights[1].intensity = glow * 98;
    }

    sparklePoints.visible = isNightGlow;
    if (isNightGlow) {
      sparkleMat.uniforms.uTime.value = elapsed;
      sparkleMat.uniforms.uNightAlpha.value = glow;
    }

    beaconGroup.visible = isNightGlow;
    if (isNightGlow) {
      matBeaconBeam.uniforms.uOpacity.value = glow * 0.44;
      beaconGroup.rotation.y += clampedDt * 0.55;
    }
  }

  return {
    id: 'tour-eiffel',
    name: 'La Tour Eiffel',
    root,
    colliders,
    circleColliders,
    worldBounds: {
      minX: EIFFEL_WORLD_POS.x - 560,
      maxX: EIFFEL_WORLD_POS.x + 580,
      minZ: EIFFEL_WORLD_POS.z - 640,
      maxZ: EIFFEL_WORLD_POS.z + 700,
    },
    fpsSpawnPos: localToWorld(0, 1.9, -46),
    fpsSpawnTarget: localToWorld(0, 38, 0),
    getFloorHeightAt,
    setLodLevel,
    introChapter,
    pois,
    update,
  };
}
