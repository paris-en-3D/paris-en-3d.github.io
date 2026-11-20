import * as THREE from 'three';
import { mergeStaticGroupByMaterial } from '../perf-manager.js';

/**
 * ============================================================================
 * MONUMENT COMPLET #2 : LA TOUR EIFFEL À L'ÉCHELLE RÉELLE 1:1 (330 m)
 * Position GPS : 48.8584° N, 2.2945° E -> (-3694, 0, +556)
 * Orientée exactement dans l'axe Trocadéro / Pont d'Iéna -> Champ-de-Mars
 *
 * Contient :
 *  - Structure treillis fer puddlé « Brun Tour Eiffel » (3 nuances officielles)
 *  - 4 piliers courbes exponentiels, 4 grands arcs, frise dorée des 72 savants
 *  - 1er étage (plancher de verre + pavillons), 2e étage (Jules Verne),
 *    Sommet (276 m, bureau de Gustave Eiffel, coupole & antenne à 330 m)
 *  - 2 ascenseurs inclinés animés + illumination dorée + scintillement + phare
 *  - Champ-de-Mars + École Militaire, Quai Branly, Pont d'Iéna,
 *    Jardins du Trocadéro + Bassin de Varsovie + Palais de Chaillot
 *  - Prologue 360° & 7 Points d'Intérêt historiques
 * ============================================================================
 */

const EIFFEL_WORLD_POS = new THREE.Vector3(-3694, 0, 556);
// Axe -Z local pointe vers le Pont d'Iéna (-136, -141) -> rotY = atan2(136, 141)
const EIFFEL_ROT_Y = Math.atan2(136, 141);

function createLatticeTexture() {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = '#6f5848';
  ctx.lineWidth = 10;

  // Cadre & croisillons en X de fer puddlé riveté
  ctx.strokeRect(5, 5, size - 10, size - 10);
  const cells = 4;
  const step = size / cells;
  ctx.lineWidth = 7;
  for (let r = 0; r < cells; r++) {
    for (let col = 0; col < cells; col++) {
      const x0 = col * step;
      const y0 = r * step;
      ctx.strokeRect(x0, y0, step, step);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + step, y0 + step);
      ctx.moveTo(x0 + step, y0);
      ctx.lineTo(x0, y0 + step);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createArchLatticeTexture() {
  const w = 512;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, w, h);

  // Remplissage treillis ajouré au-dessus de l'arc semi-circulaire
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.arc(w * 0.5, h, w * 0.44, Math.PI, 0, false);
  ctx.closePath();
  ctx.clip();

  ctx.strokeStyle = '#665041';
  ctx.lineWidth = 6;
  for (let x = 0; x <= w; x += 28) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += 28) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  for (let x = -h; x <= w + h; x += 28) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + h, h);
    ctx.moveTo(x + h, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  ctx.restore();

  // Grande arche doublée en fer puddlé
  ctx.beginPath();
  ctx.arc(w * 0.5, h, w * 0.44, Math.PI, 0, false);
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#5a4638';
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function create72ScholarsTexture() {
  const w = 2048;
  const h = 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#5e493b';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#d4a64a';
  ctx.lineWidth = 5;
  ctx.strokeRect(4, 10, w - 8, h - 20);

  const names = [
    'SEGUIN', 'LALANDE', 'TRESCA', 'PONCELET', 'BRESSE', 'LAGRANGE',
    'CHAPTAL', 'JAMIN', 'GAY-LUSSAC', 'FIZEAU', 'PASTEUR', 'BECQUEREL',
    'LAVOISIER', 'AMPÈRE', 'LAPLACE', 'FOUCAULT', 'FRESNEL', 'MONGE',
  ];
  ctx.fillStyle = '#f2cc70';
  ctx.font = 'bold 26px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const step = w / names.length;
  names.forEach((n, idx) => {
    ctx.fillText(n, step * (idx + 0.5), h * 0.52);
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
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

  // Assises en pierre de taille
  ctx.fillStyle = 'rgba(85, 75, 62, 0.14)';
  for (let y = 0; y < h; y += 22) {
    ctx.fillRect(0, y, w, 1.5);
  }

  // Rez-de-chaussée commercial + store
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

  // 4 étages carrés + comble brisis ardoise
  const floorYs = [312, 232, 152, 72];
  floorYs.forEach((fy, idx) => {
    // Corniche pierre
    ctx.fillStyle = '#cfc3ae';
    ctx.fillRect(0, fy + 64, w, 6);

    for (let col = 0; col < 7; col++) {
      const wx = 20 + col * 70;
      // Encadrement pierre
      ctx.fillStyle = '#ebe3d3';
      ctx.fillRect(wx - 4, fy + 6, 40, 56);
      // Vitre sombre + reflets
      ctx.fillStyle = '#263442';
      ctx.fillRect(wx, fy + 10, 32, 48);
      // Croisillons blancs
      ctx.fillStyle = '#e7dfd2';
      ctx.fillRect(wx + 15, fy + 10, 2, 48);
      ctx.fillRect(wx, fy + 26, 32, 2);
      // Garde-corps fer forgé (balcons filants au 2e et 5e)
      if (idx === 0 || idx === 3) {
        ctx.fillStyle = '#26292e';
        ctx.fillRect(0, fy + 50, w, 9);
      } else {
        ctx.fillStyle = '#2b2e33';
        ctx.fillRect(wx - 2, fy + 48, 36, 9);
      }
    }
  });

  // Ligne toiture haute
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

  // Travertin clair Art Déco 1937
  ctx.fillStyle = '#ede5d6';
  ctx.fillRect(0, 0, w, h);

  // Hautes baies entre pilastres cannelés
  for (let col = 0; col < 8; col++) {
    const x = 16 + col * 62;
    ctx.fillStyle = '#3b4a59';
    ctx.fillRect(x, 68, 34, 365);
    ctx.fillStyle = '#ded4c2';
    ctx.fillRect(x + 34, 42, 28, 430);
    // Meneaux verticaux
    ctx.fillStyle = '#d4ccb9';
    ctx.fillRect(x + 15, 68, 4, 365);
    ctx.fillRect(x, 195, 34, 8);
    ctx.fillRect(x, 315, 34, 8);
  }
  // Entablement & frise dorée
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

// Profil exponentiel historique de la Tour Eiffel : demi-envergure extérieure & largeur de pilier
const PROFILE_KEYS = [
  { y: 0.0,   centerSpan: 49.5, legHalf: 13.0 },
  { y: 28.0,  centerSpan: 38.0, legHalf: 9.6 },
  { y: 57.6,  centerSpan: 28.5, legHalf: 7.0 },
  { y: 86.0,  centerSpan: 21.8, legHalf: 5.2 },
  { y: 115.7, centerSpan: 15.8, legHalf: 3.8 },
  { y: 155.0, centerSpan: 10.2, legHalf: 2.8 },
  { y: 195.0, centerSpan: 7.4,  legHalf: 2.2 },
  { y: 235.0, centerSpan: 6.2,  legHalf: 1.9 },
  { y: 276.0, centerSpan: 5.6,  legHalf: 1.8 },
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

  // Conversion coordonnée locale -> monde Paris 1:1
  function localToWorld(lx, ly, lz) {
    return new THREE.Vector3(lx, ly, lz).applyMatrix4(root.matrixWorld);
  }

  function registerLocalCircleCollider(lx, lz, r) {
    const w = localToWorld(lx, 0, lz);
    circleColliders.push({ x: w.x, z: w.z, r });
  }

  // --- MATÉRIAUX ---
  // Nuances historiques « Brun Tour Eiffel » (plus foncé en bas, plus clair en haut)
  const matIronBase = new THREE.MeshStandardMaterial({
    color: 0x5c4738,
    roughness: 0.52,
    metalness: 0.62,
    emissive: new THREE.Color(0x000000),
  });
  const matIronMid = new THREE.MeshStandardMaterial({
    color: 0x6b5444,
    roughness: 0.5,
    metalness: 0.6,
    emissive: new THREE.Color(0x000000),
  });
  const matIronTop = new THREE.MeshStandardMaterial({
    color: 0x7b6352,
    roughness: 0.48,
    metalness: 0.58,
    emissive: new THREE.Color(0x000000),
  });
  const ironMaterials = [matIronBase, matIronMid, matIronTop];

  const texLattice = createLatticeTexture();
  const matLattice = new THREE.MeshStandardMaterial({
    map: texLattice,
    alphaTest: 0.35,
    side: THREE.DoubleSide,
    roughness: 0.55,
    metalness: 0.55,
    emissive: new THREE.Color(0x000000),
  });
  const matArchLattice = new THREE.MeshStandardMaterial({
    map: createArchLatticeTexture(),
    alphaTest: 0.3,
    side: THREE.DoubleSide,
    roughness: 0.55,
    metalness: 0.55,
    emissive: new THREE.Color(0x000000),
  });
  const mat72Scholars = new THREE.MeshStandardMaterial({
    map: create72ScholarsTexture(),
    roughness: 0.45,
    metalness: 0.4,
  });

  const matDeck = new THREE.MeshStandardMaterial({ color: 0x524841, roughness: 0.78 });
  const matGlassFloor = new THREE.MeshStandardMaterial({
    color: 0xaad4eb,
    roughness: 0.12,
    metalness: 0.3,
    transparent: true,
    opacity: 0.42,
    side: THREE.DoubleSide,
  });
  const matPavilion = new THREE.MeshStandardMaterial({ color: 0x7d3228, roughness: 0.6, metalness: 0.25 });
  const matGlassWindow = new THREE.MeshStandardMaterial({
    color: 0x9ac5dc,
    roughness: 0.16,
    metalness: 0.6,
    transparent: true,
    opacity: 0.68,
  });
  const matGold = new THREE.MeshStandardMaterial({ color: 0xdfb152, roughness: 0.28, metalness: 0.84 });
  const matStone = new THREE.MeshStandardMaterial({ color: 0xded4c0, roughness: 0.84 });
  const matStoneLight = new THREE.MeshStandardMaterial({ color: 0xede6d8, roughness: 0.78 });
  const matGranite = new THREE.MeshStandardMaterial({ color: 0xc2bbb0, roughness: 0.88 });
  const matGrass = new THREE.MeshStandardMaterial({ color: 0x4b6e3a, roughness: 0.94 });
  const matWater = new THREE.MeshStandardMaterial({
    color: 0x2c5c72,
    roughness: 0.12,
    metalness: 0.65,
    transparent: true,
    opacity: 0.86,
  });
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

  /**
   * ==========================================================================
   * 1. STRUCTURE TREILLIS 3D EN FER PUDDLÉ (ARBALÉTRIERS + ENTRETOISES + CROISILLONS)
   *    Regroupée dans un InstancedMesh haute performance (~650 poutres -> 1 draw call !)
   * ==========================================================================
   */
  const beams = [];
  const upVec = new THREE.Vector3(0, 1, 0);
  const tmpDir = new THREE.Vector3();
  const tmpQuat = new THREE.Quaternion();

  function queueBeam(p0, p1, thickness = 0.72, tier = 0) {
    const len = p0.distanceTo(p1);
    if (len < 0.05) return;
    const mid = p0.clone().add(p1).multiplyScalar(0.5);
    tmpDir.subVectors(p1, p0).normalize();
    tmpQuat.setFromUnitVectors(upVec, tmpDir);
    beams.push({ pos: mid, quat: tmpQuat.clone(), sx: thickness, sy: len, sz: thickness, tier });
  }

  // Sous-sections du rez-de-chaussée jusqu'au 2e étage (4 piliers séparés aux 4 quadrants)
  const lowerLevels = [0, 14, 28, 43, 57.6, 72, 87, 102, 115.7];
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

  const towerStaticShell = new THREE.Group();
  towerStaticShell.name = 'TourEiffelStaticShell';
  root.add(towerStaticShell);

  legSigns.forEach(([sx, sz]) => {
    for (let i = 0; i < lowerLevels.length - 1; i++) {
      const y0 = lowerLevels[i];
      const y1 = lowerLevels[i + 1];
      const tier = y0 < 57 ? 0 : 1;
      const thick = y0 < 57 ? 1.15 : 0.92;
      const c0 = getCornerPoints(y0, sx, sz);
      const c1 = getCornerPoints(y1, sx, sz);

      // 4 arbalétriers principaux du pilier + entretoises horizontales + croisillons en X
      for (let k = 0; k < 4; k++) {
        const nextK = (k + 1) % 4;
        queueBeam(c0[k], c1[k], thick, tier);
        queueBeam(c1[k], c1[nextK], thick * 0.72, tier);
        queueBeam(c0[k], c1[nextK], thick * 0.45, tier);
        queueBeam(c0[nextK], c1[k], thick * 0.45, tier);
      }

      // Panneaux treillis alpha sur les 4 faces de chaque tronçon pour la finesse dentelée
      const p0 = sampleTowerProfile(y0);
      const p1 = sampleTowerProfile(y1);
      const midY = (y0 + y1) * 0.5;
      const hSeg = y1 - y0;
      const midSpan = (p0.centerSpan + p1.centerSpan) * 0.5;
      const midW = (p0.legHalf + p1.legHalf);
      const tilt = Math.atan2((p0.centerSpan - p1.centerSpan) * 1.0, hSeg);

      for (let f = 0; f < 4; f++) {
        const pane = new THREE.Mesh(new THREE.PlaneGeometry(midW, hSeg), matLattice);
        const angleF = (f * Math.PI) * 0.5;
        pane.position.set(
          sx * midSpan + Math.sin(angleF) * (midW * 0.5),
          midY,
          sz * midSpan + Math.cos(angleF) * (midW * 0.5)
        );
        pane.rotation.y = angleF;
        pane.rotation.x = f === 0 ? -tilt * sz : f === 2 ? tilt * sz : 0;
        towerStaticShell.add(pane);
      }
    }
  });

  // 4 Massifs de fondation en pierre calcaire aux 4 coins des 4 piliers (parvis central 100% libre !)
  legSigns.forEach(([sx, sz]) => {
    const corners = getCornerPoints(0, sx, sz);
    corners.forEach((pt) => {
      addBox(4.8, 3.6, 4.8, pt.x, 1.8, pt.z, matStone, { parent: towerStaticShell });
      registerLocalCircleCollider(pt.x, pt.z, 2.7);
    });
    // Petits pavillons d'accueil / guichets vitrés discrets au pied de chaque pilier
    const cx = sx * 49.5;
    const cz = sz * 49.5;
    addBox(9.5, 4.2, 9.5, cx, 2.1, cz, matPavilion, { parent: towerStaticShell });
    registerLocalCircleCollider(cx, cz, 5.4);
  });

  // Fût central (du 2e étage y = 115.7 m jusqu'au Sommet y = 276 m)
  const upperLevels = [115.7, 138, 162, 186, 210, 234, 256, 276];
  for (let i = 0; i < upperLevels.length - 1; i++) {
    const y0 = upperLevels[i];
    const y1 = upperLevels[i + 1];
    const tier = y0 < 185 ? 1 : 2;
    const p0 = sampleTowerProfile(y0);
    const p1 = sampleTowerProfile(y1);
    const r0 = p0.centerSpan + p0.legHalf * 0.45;
    const r1 = p1.centerSpan + p1.legHalf * 0.45;

    const u0 = [
      new THREE.Vector3(-r0, y0, -r0),
      new THREE.Vector3(r0, y0, -r0),
      new THREE.Vector3(r0, y0, r0),
      new THREE.Vector3(-r0, y0, r0),
    ];
    const u1 = [
      new THREE.Vector3(-r1, y1, -r1),
      new THREE.Vector3(r1, y1, -r1),
      new THREE.Vector3(r1, y1, r1),
      new THREE.Vector3(-r1, y1, r1),
    ];

    const thick = y0 < 190 ? 0.92 : 0.74;
    for (let k = 0; k < 4; k++) {
      const nextK = (k + 1) % 4;
      queueBeam(u0[k], u1[k], thick, tier);
      queueBeam(u1[k], u1[nextK], thick * 0.72, tier);
      queueBeam(u0[k], u1[nextK], thick * 0.48, tier);
      queueBeam(u0[nextK], u1[k], thick * 0.48, tier);
    }
  }

  // Instanciation des poutrelles par nuance (3 draw calls au total pour toute l'ossature 3D !)
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

  // --- 4 GRANDS ARCS DÉCORATIFS SEMI-CIRCULAIRES SOUS LE 1ER ÉTAGE (y = 14..52 m) ---
  [
    { x: 0, z: -38.5, rotY: 0 },
    { x: 0, z: 38.5,  rotY: Math.PI },
    { x: 38.5, z: 0,  rotY: Math.PI * 0.5 },
    { x: -38.5, z: 0, rotY: -Math.PI * 0.5 },
  ].forEach((archSpec) => {
    const archMesh = new THREE.Mesh(new THREE.PlaneGeometry(70, 35), matArchLattice);
    archMesh.position.set(archSpec.x, 34.5, archSpec.z);
    archMesh.rotation.y = archSpec.rotY;
    towerStaticShell.add(archMesh);
  });

  // Fusionne les 152 panneaux treillis, fondations, guichets & 4 arcs en 4 draw calls !
  mergeStaticGroupByMaterial(towerStaticShell);

  /**
   * ==========================================================================
   * 2. LES 3 ÉTAGES VISITABLES & LE SOMMET À 330 MÈTRES
   * ==========================================================================
   */

  // --- A. PREMIER ÉTAGE (y = 57.6 m, 71 m × 71 m, vide central + plancher de verre) ---
  const lvl1 = new THREE.Group();
  lvl1.position.y = 57.6;
  root.add(lvl1);

  // Frise dorée des 72 savants sur les 4 faces sous le 1er étage
  addBox(68.2, 3.2, 68.2, 0, -2.6, 0, mat72Scholars, { parent: lvl1 });
  // Tablier carré du 1er étage percé en son centre (4 bandes formant un anneau carré)
  addBox(71, 1.4, 18, 0, -0.7, -26.5, matDeck, { parent: lvl1 });
  addBox(71, 1.4, 18, 0, -0.7, +26.5, matDeck, { parent: lvl1 });
  addBox(18, 1.4, 35, -26.5, -0.7, 0, matDeck, { parent: lvl1 });
  addBox(18, 1.4, 35, +26.5, -0.7, 0, matDeck, { parent: lvl1 });

  // Plancher de verre spectaculaire bordant le vide central (y = 57.6 m)
  addBox(35, 0.16, 4.5, 0, 0.02, -15.2, matGlassFloor, { cast: false, parent: lvl1 });
  addBox(35, 0.16, 4.5, 0, 0.02, +15.2, matGlassFloor, { cast: false, parent: lvl1 });
  addBox(4.5, 0.16, 26, -15.2, 0.02, 0, matGlassFloor, { cast: false, parent: lvl1 });
  addBox(4.5, 0.16, 26, +15.2, 0.02, 0, matGlassFloor, { cast: false, parent: lvl1 });

  // Garde-corps extérieurs & intérieurs
  addBox(71.4, 1.3, 0.35, 0, 0.65, -35.5, matIronBase, { parent: lvl1 });
  addBox(71.4, 1.3, 0.35, 0, 0.65, +35.5, matIronBase, { parent: lvl1 });
  addBox(0.35, 1.3, 71.4, -35.5, 0.65, 0, matIronBase, { parent: lvl1 });
  addBox(0.35, 1.3, 71.4, +35.5, 0.65, 0, matIronBase, { parent: lvl1 });

  // Pavillons du 1er étage (Madame Brasserie, Pavillon Ferrié, Salle Gustave Eiffel)
  addBox(24, 6.2, 8.5, 0, 3.1, -24.5, matPavilion, { parent: lvl1 });
  addBox(23.2, 4.2, 8.8, 0, 3.0, -24.5, matGlassWindow, { cast: false, parent: lvl1 });
  addBox(8.5, 6.2, 22, 24.5, 3.1, 0, matPavilion, { parent: lvl1 });
  addBox(8.8, 4.2, 21.2, 24.5, 3.0, 0, matGlassWindow, { cast: false, parent: lvl1 });
  addBox(8.5, 6.2, 22, -24.5, 3.1, 0, matPavilion, { parent: lvl1 });

  // --- B. DEUXIÈME ÉTAGE (y = 115.7 m, 41 m × 41 m) ---
  const lvl2 = new THREE.Group();
  lvl2.position.y = 115.7;
  root.add(lvl2);

  addBox(41.5, 2.2, 41.5, 0, -1.1, 0, matDeck, { parent: lvl2 });
  addBox(41.8, 1.3, 0.35, 0, 0.65, -20.7, matIronMid, { parent: lvl2 });
  addBox(41.8, 1.3, 0.35, 0, 0.65, +20.7, matIronMid, { parent: lvl2 });
  addBox(0.35, 1.3, 41.8, -20.7, 0.65, 0, matIronMid, { parent: lvl2 });
  addBox(0.35, 1.3, 41.8, +20.7, 0.65, 0, matIronMid, { parent: lvl2 });
  // Pavillon du Jules Verne & galerie supérieure (y = 118 m)
  addBox(28, 5.4, 28, 0, 2.7, 0, matIronMid, { parent: lvl2 });
  addBox(28.4, 3.4, 28.4, 0, 2.8, 0, matGlassWindow, { cast: false, parent: lvl2 });
  addBox(34, 1.1, 34, 0, 5.9, 0, matDeck, { parent: lvl2 });

  // --- C. SOMMET (y = 276 m -> 330 m) : BUREAU DE GUSTAVE EIFFEL, COUPON & PHARE ---
  const summit = new THREE.Group();
  summit.position.y = 276;
  root.add(summit);

  // Plateforme inférieure & supérieure du Sommet (17m × 17m)
  addBox(17.5, 2.0, 17.5, 0, -1.0, 0, matDeck, { parent: summit });
  addBox(17.8, 1.2, 0.3, 0, 0.6, -8.7, matIronTop, { parent: summit });
  addBox(17.8, 1.2, 0.3, 0, 0.6, +8.7, matIronTop, { parent: summit });
  addBox(0.3, 1.2, 17.8, -8.7, 0.6, 0, matIronTop, { parent: summit });
  addBox(0.3, 1.2, 17.8, +8.7, 0.6, 0, matIronTop, { parent: summit });

  // Bureau vitré historique de Gustave Eiffel (276 m .. 283 m)
  addBox(11.5, 6.2, 11.5, 0, 3.1, 0, matIronTop, { parent: summit });
  addBox(11.8, 4.6, 11.8, 0, 3.1, 0, matGlassWindow, { cast: false, parent: summit });
  // Terrasse supérieure (283 m) & coupole
  addBox(14.0, 1.2, 14.0, 0, 6.8, 0, matDeck, { parent: summit });
  const campanile = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 5.4, 13.5, 12), matIronTop);
  campanile.position.y = 14.0;
  summit.add(campanile);
  const summitDome = new THREE.Mesh(
    new THREE.SphereGeometry(4.5, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
    matGold
  );
  summitDome.position.y = 20.6;
  summit.add(summitDome);

  // Antenne TNT & paratonnerre culminant à exactement 330 m (276 + 54 = 330 m)
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 1.15, 29.5, 10), matIronTop);
  spire.position.y = 39.2;
  summit.add(spire);

  // Phare rotatif à double faisceau (actif la nuit à y = 301 m)
  const beaconGroup = new THREE.Group();
  beaconGroup.position.y = 25.0;
  beaconGroup.userData.noMerge = true;
  summit.add(beaconGroup);

  const matBeaconBeam = new THREE.MeshBasicMaterial({
    color: 0xfff2c2,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const beamConeGeo = new THREE.ConeGeometry(42, 720, 18, 1, true);
  beamConeGeo.translate(0, -360, 0);
  beamConeGeo.rotateX(Math.PI * 0.5);

  const beamA = new THREE.Mesh(beamConeGeo, matBeaconBeam);
  beaconGroup.add(beamA);
  const beamB = new THREE.Mesh(beamConeGeo, matBeaconBeam);
  beamB.rotation.y = Math.PI;
  beaconGroup.add(beamB);
  beaconGroup.visible = false;

  // Fusion des plateformes & éléments statiques des 3 étages (beaconGroup exclu)
  mergeStaticGroupByMaterial(lvl1);
  mergeStaticGroupByMaterial(lvl2);
  mergeStaticGroupByMaterial(summit);

  /**
   * ==========================================================================
   * 3. ASCENSEURS PANORAMIQUES INCLINÉS & VERTICAUX + SCINTILLEMENT NOCTURNE
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

  // Construction d'une cabine vitrée à impériale (2 niveaux) sur bogie articulé
  function buildInclinedElevatorCarriage(sx, sz, phase) {
    const carriage = new THREE.Group();
    carriage.rotation.y = Math.atan2(-sx, -sz);
    elevatorGroup.add(carriage);

    // Chariot bogie orienté selon la courbure locale des rails (+Z = vers le centre de la Tour)
    const bogie = new THREE.Group();
    carriage.add(bogie);
    [-1.35, 1.35].forEach((rx) => {
      addLocalBoxTo(bogie, 0.24, 4.4, 0.34, rx, 0, 0, matElevRail);
      // 2 galets de roulement par rail
      [-1.55, 1.55].forEach((ry) => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.28, 12), matElevCable);
        wheel.rotation.z = Math.PI * 0.5;
        wheel.position.set(rx, ry, 0.05);
        bogie.add(wheel);
      });
    });
    // Traverses & compas articulé maintenant le berceau de cabine
    [-1.4, 0, 1.4].forEach((ry) => addLocalBoxTo(bogie, 2.9, 0.22, 0.28, 0, ry, 0, matElevFrame));
    addLocalBoxTo(bogie, 2.5, 0.32, 1.6, 0, 0.4, -0.75, matElevFrame);

    // Cabine double étage toujours horizontale (suspendue juste devant les rails à z = -1.85)
    const cabin = new THREE.Group();
    cabin.position.set(0, 0.25, -1.85);
    carriage.add(cabin);

    // Bras de suspension arrière reliant la cabine horizontale au bogie
    [-1.1, 1.1].forEach((ax) => {
      addLocalBoxTo(cabin, 0.24, 0.32, 1.85, ax, 0.2, 0.9, matElevFrame);
      addLocalBoxTo(cabin, 0.22, 0.28, 1.55, ax, 4.4, 0.9, matElevFrame);
    });

    // Plancher inférieur, plancher intermédiaire (2e niveau), toiture vitrée & lanterneau
    addLocalBoxTo(cabin, 3.25, 0.28, 3.05, 0, 0.14, 0, matElevFrame);
    addLocalBoxTo(cabin, 3.35, 0.24, 3.15, 0, 2.45, 0, matElevAccent);
    addLocalBoxTo(cabin, 3.25, 0.28, 3.05, 0, 4.78, 0, matElevFrame);
    addLocalBoxTo(cabin, 2.1, 0.32, 1.9, 0, 5.05, 0, matElevAccent);

    // 4 montants principaux + meneaux d'acier brun Eiffel
    [-1.52, 1.52].forEach((cx) => {
      [-1.42, 1.42].forEach((cz) => {
        addLocalBoxTo(cabin, 0.18, 4.65, 0.18, cx, 2.45, cz, matElevFrame);
      });
      addLocalBoxTo(cabin, 0.12, 4.65, 0.12, cx, 2.45, 0, matElevFrame);
    });
    [-1.42, 1.42].forEach((cz) => {
      addLocalBoxTo(cabin, 0.12, 4.65, 0.12, 0, 2.45, cz, matElevFrame);
    });

    // Grandes baies vitrées panoramiques des 2 étages
    addLocalBoxTo(cabin, 3.04, 2.02, 2.84, 0, 1.3, 0, matElevGlass);
    addLocalBoxTo(cabin, 3.04, 2.02, 2.84, 0, 3.6, 0, matElevGlass);

    // Plafonniers chauds & colonne centrale en laiton visibles à travers la vitre
    const cylCore = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 4.5, 8), matGold);
    cylCore.position.set(0, 2.45, 0);
    cabin.add(cylCore);
    addLocalBoxTo(cabin, 2.2, 0.12, 2.0, 0, 2.28, 0, matElevInteriorGlow);
    addLocalBoxTo(cabin, 2.2, 0.12, 2.0, 0, 4.58, 0, matElevInteriorGlow);

    // Silhouettes discrètes de passagers à bord
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

  // Rails courbes inclinés, traverses & câbles sur 3 piliers (Ouest, Est, Nord)
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

      // Câble de traction central
      addCylinderBetween(elevatorGroup, c0, c1, 0.06, 0.06, matElevCable);

      // Traverse métallique tous les 2 tronçons
      if (i % 2 === 0) {
        const tL = new THREE.Vector3(c0.x - perpX * 1.48, y0, c0.z - perpZ * 1.48);
        const tR = new THREE.Vector3(c0.x + perpX * 1.48, y0, c0.z + perpZ * 1.48);
        addCylinderBetween(elevatorGroup, tL, tR, 0.11, 0.11, matElevFrame);
      }
    }

    // Petit auvent vitré d'embarquement en bas du rail (y = 5.4 m)
    const canopy = new THREE.Group();
    const pLow = sampleTowerProfile(5.4);
    canopy.position.set(sx * pLow.centerSpan, 5.4, sz * pLow.centerSpan);
    canopy.rotation.y = Math.atan2(-sx, -sz);
    addLocalBoxTo(canopy, 5.2, 0.25, 4.2, 0, 3.6, -1.5, matElevGlass);
    addLocalBoxTo(canopy, 5.4, 0.18, 4.4, 0, 3.78, -1.5, matElevFrame);
    elevatorGroup.add(canopy);

    return buildInclinedElevatorCarriage(sx, sz, phase);
  });

  // Cage verticale ajourée & 2 cabines vitrées du 2e étage (116 m) au Sommet (274 m)
  [-3.2, 3.2].forEach((vx) => {
    [-1.4, 1.4].forEach((vz) => {
      addLocalBoxTo(elevatorGroup, 0.18, 158, 0.18, vx, 195, vz, matElevRail);
    });
  });
  for (let gy = 122; gy <= 270; gy += 16) {
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

  // Fusion des ~260 segments de rails courbes, traverses, câbles & cage verticale en ~3 draw calls !
  mergeStaticGroupByMaterial(elevatorGroup);

  function computeElevatorCycle01(tPhase) {
    // Cycle fluide en 0..1 avec pauses en station (bas, 1er étage, sommet)
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

  // Nuage de ~650 points scintillants répartis le long des arbalétriers et étages
  const sparkleCount = 680;
  const sparklePositions = new Float32Array(sparkleCount * 3);
  const sparklePhases = new Float32Array(sparkleCount);

  for (let i = 0; i < sparkleCount; i++) {
    const t = i / sparkleCount;
    const y = 6 + t * 292;
    let px, pz;
    if (y <= 115.7) {
      const leg = legSigns[i % 4];
      const prof = sampleTowerProfile(y);
      const jitterX = (((i * 73) % 100) / 100 - 0.5) * prof.legHalf * 1.8;
      const jitterZ = (((i * 137) % 100) / 100 - 0.5) * prof.legHalf * 1.8;
      px = leg[0] * prof.centerSpan + jitterX;
      pz = leg[1] * prof.centerSpan + jitterZ;
    } else if (y <= 276) {
      const prof = sampleTowerProfile(y);
      const r = prof.centerSpan + prof.legHalf * 0.45;
      const side = i % 4;
      const u = (((i * 97) % 100) / 100 - 0.5) * 2 * r;
      px = side === 0 ? -r : side === 1 ? r : u;
      pz = side === 2 ? -r : side === 3 ? r : u;
    } else {
      const r = 4.2 * (1 - (y - 276) / 30);
      const a = i * 1.7;
      px = Math.cos(a) * Math.max(0.5, r);
      pz = Math.sin(a) * Math.max(0.5, r);
    }
    sparklePositions[i * 3] = px;
    sparklePositions[i * 3 + 1] = y;
    sparklePositions[i * 3 + 2] = pz;
    sparklePhases[i] = (i * 17.3) % (Math.PI * 2);
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
        float wave = sin(uTime * 11.0 + aPhase * 7.0) * sin(uTime * 5.3 + aPhase * 3.1);
        vTwinkle = smoothstep(0.18, 0.95, wave) * uNightAlpha;
        gl_PointSize = (6.0 + vTwinkle * 16.0) * (320.0 / max(20.0, -mvPosition.z));
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
        float glow = pow(1.0 - d * 2.0, 2.2);
        gl_FragColor = vec4(vec3(1.0, 0.94, 0.72), glow * vTwinkle);
      }
    `,
  });
  const sparklePoints = new THREE.Points(sparkleGeo, sparkleMat);
  root.add(sparklePoints);

  // Lumières d'ambiance dorées nocturnes sur la Tour
  const towerNightLights = [
    new THREE.PointLight(0xffb85c, 0, 220, 1.4),
    new THREE.PointLight(0xffc975, 0, 220, 1.4),
  ];
  towerNightLights[0].position.set(0, 32, 0);
  towerNightLights[1].position.set(0, 145, 0);
  root.add(towerNightLights[0], towerNightLights[1]);

  /**
   * ==========================================================================
   * 4. ENVIRONNEMENT IMMÉDIAT HAUTE FIDÉLITÉ :
   *    PARVIS, CHAMP-DE-MARS, HAUSSMANN SUFFREN/BOURDONNAIS, ÉCOLE MILITAIRE,
   *    QUAI BRANLY, PONT D'IÉNA (5 ARCHES), TROCADÉRO & PALAIS DE CHAILLOT
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

  // Helper route texturée partageant un seul matériau (UVs ajustées par tronçon -> 1 draw call !)
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

  // Helpers carrefours & passages piétons partageant les matériaux existants (0 draw call en plus)
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

  // A. Parvis de la Tour Eiffel & Jardins romantiques (z = -121 .. +99, au contact du Quai Branly)
  addBox(234, 0.26, 220, 0, -0.01, -11, matGravelTex, { cast: false, parent: envGroup });
  addBox(128, 0.12, 128, 0, 0.12, 0, matGranite, { cast: false, parent: envGroup });
  // Parterres verts & 2 bassins romantiques Est / Ouest
  [-74, 74].forEach((bx) => {
    addBox(36, 0.18, 176, bx, 0.11, -10, matGrassTex, { cast: false, parent: envGroup });
    addBox(24, 0.42, 46, bx, 0.26, 2, matStoneLight, { parent: envGroup });
    addBox(20, 0.22, 42, bx, 0.42, 2, matWater, { cast: false, parent: envGroup });
  });

  // B. Réseau routier maillé Rive Gauche (connecté sans doublon sur le Quai Branly continu en z = -133,5)
  // 1) Avenue de Suffren (Ouest, x = -126) & Avenue de la Bourdonnais (Est, x = +126) : Quai Branly -> Place Joffre
  addAvenueRoad(16, 874, -126, 0.22, 310.5, false);
  addAvenueRoad(16, 874, +126, 0.22, 310.5, false);
  // 2) Rues transversales : Gustave-Eiffel (z = +106), Joseph-Bouvard (z = +420), Place Joffre (z = +756)
  addAvenueRoad(15, 236, 0, 0.22, 106, true);
  addAvenueRoad(15, 96, -70, 0.22, 420, true);
  addAvenueRoad(15, 96, +70, 0.22, 420, true);
  addAvenueRoad(18, 360, 0, 0.22, 756, true);
  // 3) Encadrement complet de l'École Militaire : Duquesne (-188), Lowendal (+188) & Avenue arrière (+868)
  addAvenueRoad(16, 112, -188, 0.22, 812, false);
  addAvenueRoad(16, 112, +188, 0.22, 812, false);
  addAvenueRoad(16, 376, 0, 0.22, 868, true);

  // Carrefours & passages piétons Rive Gauche (zéro pointillé au milieu des intersections)
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

  // 4) Boucle Rive Droite : Avenue de New-York (z = -306,5) <-> Place de Varsovie <-> Trocadéro <-> Chaillot
  addIntersectionPad(34, 21, 0, -309.5);
  addCrosswalk(-22, -306.5, 7, false);
  addCrosswalk(+22, -306.5, 7, false);
  addCrosswalk(0, -317, 9, true);

  // Place de Varsovie (rond-point en z = -340) & deux ailes de l'Avenue des Nations-Unies
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

  // Avenues latérales du Trocadéro (x = -196 Rue Le Nôtre / Franklin, x = +196 Albert-de-Mun) reliant Ave de New-York -> Place du Trocadéro
  addAvenueRoad(16, 261.5, -196, 0.22, -437.25, false);
  addAvenueRoad(16, 261.5, +196, 0.22, -437.25, false);
  // Boulevard arrière : Avenue Georges-Mandel & Avenue du Président-Wilson -> Place du Trocadéro (z = -568)
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
  addBox(2.0, 2.6, 3.4, 0, 4.3, -568, matGold, { parent: envGroup });

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

  // 6 pelouses symétriques + bordures pierre + allées diagonales
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
  // Jardins sous la Tour Eiffel & boisement du Trocadéro
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

  // Réverbères du Pont d'Iéna (suivant la cambrure) + Trocadéro + Champ-de-Mars
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

  // Immeubles haussmanniens 3D détaillés encadrant Parvis/Suffren/Bourdonnais (±156) & Trocadéro (±220 / -608)
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

  // Îlots bordant le Parvis & Quai Branly (-76, +18) puis tout le Champ-de-Mars
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
  // Îlots encadrant les avenues du Trocadéro (±220) & Place du Trocadéro (-604)
  [-382, -456, -530].forEach((hz, rIdx) => {
    [-1, 1].forEach((side, sIdx) => {
      addHaussmannFacadeBlock(side * 220, hz, 56, 22.2 + ((rIdx + sIdx) % 3) * 1.2, side, haussFacadeMats[(rIdx + sIdx + 1) % 3]);
    });
  });
  [-118, 0, 118].forEach((hx, idx) => {
    addHaussmannFacadeBlock(hx, -604, 68, 23.0 + (idx % 2) * 1.4, -1, haussFacadeMats[idx % 3], true);
  });

  // D. École Militaire haute fidélité fermant la perspective Sud-Est (z = +808)
  const ecoleM = new THREE.Group();
  ecoleM.position.set(0, 0, 812);
  envGroup.add(ecoleM);
  // Cour d'honneur pavée & grille d'entrée (côté Place Joffre)
  addBox(120, 0.16, 48, 0, 0.08, -32, matGranite, { cast: false, parent: ecoleM });
  [-48, -16, 16, 48].forEach((px) => addBox(1.8, 5.2, 1.8, px, 2.6, -54, matStoneLight, { parent: ecoleM }));
  addBox(98, 2.8, 0.25, 0, 1.5, -54, matLampPost, { parent: ecoleM });
  // Corps central & ailes symétriques de Gabriel
  addBox(216, 25, 36, 0, 12.5, 0, haussFacadeMats[0], { parent: ecoleM });
  addBox(212, 5.5, 32, 0, 27.5, 0, matSlateRoof, { parent: ecoleM });
  // Pavillon central avec portique à 8 colonnes corinthiennes + fronton triangulaire + dôme quadrangulaire
  addBox(48, 31, 44, 0, 15.5, -2, matStoneLight, { parent: ecoleM });
  for (let ci = 0; ci < 8; ci++) {
    const cx = -17.5 + ci * 5.0;
    const colMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 18.5, 10), matStoneLight);
    colMesh.position.set(cx, 13.5, -25.2);
    colMesh.castShadow = true;
    ecoleM.add(colMesh);
  }
  const emPediment = new THREE.Mesh(new THREE.ConeGeometry(22, 7.5, 3), matStoneLight);
  emPediment.rotation.y = Math.PI * 0.5;
  emPediment.rotation.z = Math.PI * 0.5;
  emPediment.scale.set(0.25, 1.1, 1.0);
  emPediment.position.set(0, 27.5, -24.5);
  ecoleM.add(emPediment);
  const emDome = new THREE.Mesh(new THREE.CylinderGeometry(6, 19, 14, 4), matSlateRoof);
  emDome.position.set(0, 38, -2);
  emDome.rotation.y = Math.PI * 0.25;
  ecoleM.add(emDome);
  const emLantern = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.8, 6.5, 8), matGold);
  emLantern.position.set(0, 47.5, -2);
  ecoleM.add(emLantern);

  // E. Pont d'Iéna centré sur le bief redressé (z = -220) en cambrure douce raccordée à niveau (y = 0,30 m)
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

  // 4 piles fluviales + 2 culées aux berges ancrées jusqu'à -5,8 m avec avant-becs pointus
  [-294, -264.4, -234.8, -205.2, -175.6, -146].forEach((pz) => {
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
    });
  });

  // 5 anneaux d'arches sculptées sous la cambrure du tablier
  [-279.2, -249.6, -220.0, -190.4, -160.8].forEach((az) => {
    const archBaseY = -0.85;
    const rise = Math.max(1.2, yPontIena(az) - 0.22 - archBaseY);
    const radius = 26 * 0.44;
    [-17.8, 17.8].forEach((sx) => {
      const archRing = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.75, 8, 18, Math.PI),
        matStoneLight
      );
      archRing.rotation.y = Math.PI * 0.5;
      archRing.scale.set(1.0, rise / radius, 1.0);
      archRing.position.set(sx, archBaseY, az);
      envGroup.add(archRing);
    });
  });

  // 4 groupes sculptés (Les Cavaliers) aux entrées du Pont d'Iéna
  [[-16.2, -142], [16.2, -142], [-16.2, -298], [16.2, -298]].forEach(([sx, sz]) => {
    addBox(3.6, 3.8, 3.6, sx, 2.2, sz, matStoneLight, { parent: envGroup });
    addBox(2.2, 2.6, 3.2, sx, 5.4, sz, matGold, { parent: envGroup });
  });

  // F. Jardins du Trocadéro, Bassin de Varsovie (16 jets animés), Parvis & Palais de Chaillot
  addBox(376, 0.24, 212, 0, 0.08, -454, matGravelTex, { cast: false, parent: envGroup });
  [-74, 74].forEach((gx) => {
    addBox(86, 0.34, 108, gx, 0.3, -428, matGrassTex, { cast: false, parent: envGroup });
    addBox(80, 0.65, 62, gx, 0.72, -456, matGrassTex, { cast: false, parent: envGroup });
  });
  [-152, 152].forEach((gx) => {
    addBox(48, 0.3, 104, gx, 0.26, -410, matGrassTex, { cast: false, parent: envGroup });
  });

  // Bassin de Varsovie & ses cascades (z = -375 .. -475)
  addBox(33, 1.0, 104, 0, 0.45, -425, matStoneLight, { parent: envGroup });
  addBox(28.5, 0.32, 99.5, 0, 0.85, -425, matWater, { cast: false, parent: envGroup });
  // Gradins de la cascade supérieure & ruissellement
  for (let st = 0; st < 4; st++) {
    addBox(28 - st * 1.5, 0.9, 5, 0, 1.2 + st * 0.85, -478 - st * 4.5, matStoneLight, { parent: envGroup });
    addBox(24 - st * 1.5, 0.22, 4.4, 0, 1.65 + st * 0.85, -478 - st * 4.5, matWater, { cast: false, parent: envGroup });
  }
  // 4 sculptures dorées autour du Bassin de Varsovie
  [[-18, -380], [18, -380], [-18, -468], [18, -468]].forEach(([sx, sz]) => {
    addBox(3.4, 2.2, 3.4, sx, 1.25, sz, matStoneLight, { parent: envGroup });
    const gStat = new THREE.Mesh(new THREE.OctahedronGeometry(1.4, 1), matGold);
    gStat.position.set(sx, 3.2, sz);
    envGroup.add(gStat);
  });

  // 16 canons à eau / jets d'eau animés du Trocadéro + illumination nocturne
  const matTrocaderoJet = new THREE.MeshStandardMaterial({
    color: 0xe6f6ff,
    emissive: new THREE.Color(0x8cd9ff),
    emissiveIntensity: 0.12,
    transparent: true,
    opacity: 0.62,
    roughness: 0.15,
  });
  const trocaderoJets = [];
  for (let ji = 0; ji < 8; ji++) {
    const jz = -464 + ji * 10.5;
    [-6.5, 6.5].forEach((jx, sIdx) => {
      const jMesh = new THREE.Mesh(new THREE.ConeGeometry(0.95, 13.5, 8), matTrocaderoJet);
      jMesh.position.set(jx, 6.9, jz);
      jMesh.rotation.z = jx > 0 ? 0.18 : -0.18;
      jMesh.rotation.x = 0.28;
      jMesh.userData.noMerge = true;
      envGroup.add(jMesh);
      trocaderoJets.push({ mesh: jMesh, baseY: 6.9, phase: ji * 0.55 + sIdx * 1.2 });
    });
  }

  // Deux grands escaliers monumentaux de pierre menant au Parvis des Droits de l'Homme
  for (let s = 0; s < 12; s++) {
    const sy = 1.1 + s * 1.05;
    const sz = -468 - s * 2.3;
    [-33, 33].forEach((sx) => {
      addBox(16, 1.2, 2.6, sx, sy, sz, matStoneLight, { cast: false, parent: envGroup });
    });
  }

  // Parvis des Droits de l'Homme (z = -512, y = 13.5 m) & 8 statues dorées
  addBox(190, 14.5, 48, 0, 6.25, -512, matStoneLight, { parent: envGroup });
  addBox(186, 1.0, 1.2, 0, 14.0, -489, matStone, { parent: envGroup });
  [-58, -48, -38, -28, 28, 38, 48, 58].forEach((sx) => {
    addBox(2.2, 2.0, 2.2, sx, 14.5, -492, matStone, { parent: envGroup });
    addBox(1.1, 2.8, 1.1, sx, 16.9, -492, matGold, { parent: envGroup });
  });

  // Palais de Chaillot : 2 pavillons Art Déco géants encadrant la perspective + 2 ailes courbes en 6 segments
  [-1, 1].forEach((side) => {
    // Pavillon monumental d'extrémité
    addBox(44, 27, 36, side * 56, 27.0, -526, matChaillotTex, { parent: envGroup });
    addBox(46, 2.2, 38, side * 56, 41.2, -526, matStoneLight, { parent: envGroup });
    // Frise dorée sommitale
    addBox(46.2, 1.1, 38.2, side * 56, 39.2, -526, matGold, { cast: false, parent: envGroup });

    // Aile courbe élégante (6 segments arc de cercle épousant la colline de Chaillot)
    const segCount = 6;
    for (let k = 0; k < segCount; k++) {
      const theta = ((k + 0.5) / segCount) * 0.72;
      const arcR = 152;
      const wx = side * (74 + Math.sin(theta) * arcR);
      const wz = -526 + (1 - Math.cos(theta)) * arcR * 1.45;
      const seg = addBox(28, 22, 24, wx, 24.5, wz, matChaillotTex, { parent: envGroup });
      seg.rotation.y = side * -theta * 1.15;
      // Soubassement ancré dans le terrain
      const baseSeg = addBox(28, 14.5, 24, wx, 6.25, wz, matStoneLight, { parent: envGroup });
      baseSeg.rotation.y = side * -theta * 1.15;
    }
  });
  // Esplanade arrière reliant le Palais de Chaillot au boulevard Place du Trocadéro (z = -560)
  addBox(260, 0.24, 34, 0, 0.08, -544, matGravelTex, { cast: false, parent: envGroup });

  // Fusion haute performance de tout l'environnement Champ-de-Mars, Haussmann, Pont d'Iéna, École Militaire & Chaillot !
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

    // Pont d'Iéna en cambrure douce (raccordé à niveau aux berges à y = 0,30 m)
    if (Math.abs(lx) < 18 && lz <= -140 && lz >= -300) {
      return yPontIena(lz);
    }

    // Parvis des Droits de l'Homme (Trocadéro haut)
    if (Math.abs(lx) < 92 && lz <= -490 && lz >= -538) return 13.55;

    if (Math.abs(lx) < 100 && Math.abs(lz) < 108) return 0.14;
    return 0.28;
  }

  // --- PROLOGUE 360° & 7 POINTS D'INTÉRÊT DE LA TOUR EIFFEL ---
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
      localCam: [0, 22, -135],
      localTarget: [0, 28, 0],
      localFps: [0, 1.9, -42],
      history:
        "Chaque pilier repose sur quatre massifs de maçonnerie ancrés jusqu'à 15 mètres de profondeur. Reliés sous le 1er étage par quatre grands arcs décoratifs culminant à 39 mètres, ils encadrent un parvis monumental de 125 mètres de côté.",
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
      localCam: [-48, 76, -88],
      localTarget: [0, 58, -16],
      localFps: [0, 59.4, -22],
      history:
        "À 57,6 mètres du sol, ce vaste plateau carré de 71 mètres de côté offre une vue plongeante sur le parvis grâce à son célèbre plancher de verre, tout en abritant Madame Brasserie et les pavillons d'exposition.",
      anecdote:
        "Juste sous la corniche du 1er étage court la frise des 72 savants : Gustave Eiffel y fit graver en lettres d'or les noms des plus grands scientifiques français (Lavoisier, Ampère, Pasteur, Foucault, Laplace…).",
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
      location: 'Galerie du 2e niveau',
      localMarker: [0, 122, -18],
      localCam: [-52, 134, -74],
      localTarget: [0, 118, 0],
      localFps: [0, 117.5, -18],
      history:
        "Perché à 115,7 mètres, le deuxième étage constitue le point d'observation privilégié sur les monuments parisiens alignés : le Trocadéro, la Seine, le Louvre, Saint-Eustache et le Sacré-Cœur se découpent nettement à l'horizon.",
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
      localCam: [-52, 294, -64],
      localTarget: [0, 282, 0],
      localFps: [0, 277.8, -7],
      history:
        "À 276 mètres au-dessus de Paris, Gustave Eiffel s'était aménagé un petit appartement vitré sous la coupole, où il reçut notamment Thomas Edison en septembre 1889. Au-dessus, le campanile porte le phare rotatif et les antennes culminant à 330 mètres.",
      anecdote:
        "Passe le curseur solaire sur 21h00 : la Tour s'embrase d'or, ses 20 000 ampoules scintillent dans la nuit parisienne et son double faisceau lumineux balaie Paris sur plusieurs kilomètres !",
    }),
    makePoi({
      id: 'eiffel-champ-de-mars',
      title: 'Le Champ-de-Mars & L’École Militaire',
      shortTitle: 'Champ-de-Mars',
      era: '1765 / 1889 • Grande perspective',
      location: 'Esplanade Sud-Est',
      localMarker: [0, 14, 290],
      localCam: [68, 72, 540],
      localTarget: [0, 75, 110],
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
      localTarget: [0, 118, -30],
      localFps: [0, 15.3, -502],
      history:
        "Dans l'axe rigoureux de la Tour Eiffel, le Pont d'Iéna à cinq arches enjambe la Seine vers les Jardins en gradins du Trocadéro, les seize canons à eau du Bassin de Varsovie et les deux ailes courbes monumentales du Palais de Chaillot (1937).",
      anecdote:
        "Le Parvis des Droits de l'Homme, bordé de ses statues dorées au sommet des escaliers du Trocadéro, constitue le point de vue le plus célèbre au monde pour embrasser d'un seul regard toute la silhouette de la Tour Eiffel.",
    }),
  ];

  /**
   * ==========================================================================
   * 6. BOUCLE D'ANIMATION : ASCENSEURS, FONTAINES, SCINTILLEMENT & PHARE ROTATIF
   * ==========================================================================
   */
  let elapsed = 0;
  let currentLod = 0;

  function setLodLevel(level) {
    currentLod = level;
    envGroup.visible = true;
    elevatorGroup.visible = level < 2;
    const showMicro = level === 0;
    benchInst.visible = showMicro;
    polesInst.visible = showMicro;
    globesInst.visible = showMicro;
    inclinedElevators.forEach((el) => { el.carriage.visible = showMicro; });
    verticalElevators.forEach((el) => { el.mesh.visible = showMicro; });
  }

  function update(dt, nightFactor = 0.1, _sunDir = null) {
    const clampedDt = Math.min(dt, 0.05);
    elapsed += clampedDt;

    // 1. Mouvement fluide des 3 ascenseurs inclinés & 2 verticaux (actifs en LOD 0)
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

    // Animation des 16 jets d'eau du Bassin de Varsovie
    if (currentLod < 2) {
      for (let i = 0; i < trocaderoJets.length; i++) {
        const jet = trocaderoJets[i];
        const sY = 0.72 + 0.34 * Math.sin(elapsed * 2.4 + jet.phase);
        jet.mesh.scale.set(1, sY, 1);
        jet.mesh.position.y = 0.85 + 6.4 * sY;
      }
    }

    // 2. Illumination dorée nocturne, cabines, réverbères, fontaines & phare rotatif
    const glow = Math.max(0, (nightFactor - 0.3) / 0.7);
    const isNightGlow = glow > 0.02;

    ironMaterials.forEach((mat) => {
      mat.emissive.setHex(0xd99238);
      mat.emissiveIntensity = glow * 0.62;
    });
    matLattice.emissive.setHex(0xd99238);
    matLattice.emissiveIntensity = glow * 0.52;
    matArchLattice.emissive.setHex(0xd99238);
    matArchLattice.emissiveIntensity = glow * 0.52;
    matElevInteriorGlow.emissiveIntensity = 0.55 + glow * 1.25;
    matStreetLampGlow.emissiveIntensity = 0.22 + glow * 1.45;
    matTrocaderoJet.emissiveIntensity = 0.12 + glow * 0.95;

    const useTowerPointLights = currentLod === 0 && glow > 0.04;
    towerNightLights[0].visible = useTowerPointLights;
    towerNightLights[1].visible = useTowerPointLights;
    if (useTowerPointLights) {
      towerNightLights[0].intensity = glow * 110;
      towerNightLights[1].intensity = glow * 95;
    }

    sparklePoints.visible = isNightGlow;
    if (isNightGlow) {
      sparkleMat.uniforms.uTime.value = elapsed;
      sparkleMat.uniforms.uNightAlpha.value = glow;
    }

    beaconGroup.visible = isNightGlow;
    if (isNightGlow) {
      matBeaconBeam.opacity = glow * 0.24;
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
