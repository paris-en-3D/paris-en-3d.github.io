import * as THREE from 'three';
import { mergeStaticGroupByMaterial } from '../perf-manager.js';
import { getParisElevation } from '../paris-data.js';

/**
 * ============================================================================
 * AXE HISTORIQUE COMPLET : L'AVENUE DES CHAMPS-ÉLYSÉES (ÉCHELLE RÉELLE 1:1)
 * De l'Arc de Triomphe (-3658, +18, -1156) à la Place de la Concorde (-1741, 0, -245)
 * Longueur : 2 122,5 m • Chaussée pavée 2x4 voies, contre-allées Wilmotte en granit,
 * Publicis, Fouquet's, Louis Vuitton, Ladurée, Galeries Lafayette, Rond-Point,
 * Jardins des Champs-Élysées, Petit Palais, Grand Palais enrichi, Concorde,
 * Obélisque doré, Fontaines Hittorff, Hôtels de Crillon & de la Marine,
 * platanes taillés au carré, candélabres et trafic animé en temps réel.
 * Budget GPU strict : ~16 draw calls max (8 statiques fusionnés + 8 InstancedMesh).
 * ============================================================================
 */

const ARC_X = -3658;
const ARC_Z = -1156;
const CONC_X = -1741;
const CONC_Z = -245;

const AZ_CE = Math.atan2(CONC_Z - ARC_Z, CONC_X - ARC_X);
export const CHAMPS_ROT_Y = Math.PI * 0.5 - AZ_CE;
const COS_R = Math.cos(CHAMPS_ROT_Y);
const SIN_R = Math.sin(CHAMPS_ROT_Y);

export function champsLocalToWorld(lx, lz) {
  return {
    x: ARC_X + lx * COS_R + lz * SIN_R,
    z: ARC_Z - lx * SIN_R + lz * COS_R,
  };
}

export function worldToChampsLocal(wx, wz) {
  const dx = wx - ARC_X;
  const dz = wz - ARC_Z;
  return {
    lx: dx * COS_R - dz * SIN_R,
    lz: dx * SIN_R + dz * COS_R,
  };
}

function elevAt(lx, lz) {
  const { x, z } = champsLocalToWorld(lx, lz);
  return getParisElevation(x, z);
}

// --- TEXTURES PROCÉDURALES ---

function createChampsCobbleRoadTexture() {
  const w = 512;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  // Pavés parisiens gris-bleuté (granit porphyrique des Champs-Élysées)
  ctx.fillStyle = '#434850';
  ctx.fillRect(0, 0, w, h);

  const rowH = 16;
  const colW = 24;
  for (let row = 0; row < h / rowH; row++) {
    const off = (row % 2) * (colW * 0.5);
    for (let col = -1; col < w / colW + 1; col++) {
      const n = ((row * 31 + col * 17) & 15) - 8;
      ctx.fillStyle = `rgb(${65 + n}, ${70 + n}, ${78 + n})`;
      ctx.fillRect(col * colW + off + 1, row * rowH + 1, colW - 2, rowH - 2);
    }
  }

  // Bordures de caniveau discrètes
  ctx.fillStyle = '#5a5f66';
  ctx.fillRect(0, 0, 8, h);
  ctx.fillRect(w - 8, 0, 8, h);

  // Double ligne axiale centrale séparant les sens Étoile ↔ Concorde
  ctx.fillStyle = 'rgba(235, 232, 224, 0.72)';
  ctx.fillRect(w * 0.5 - 5, 0, 3, h);
  ctx.fillRect(w * 0.5 + 2, 0, 3, h);

  // Pointillés des 2 x 4 voies de circulation
  const laneU = [0.135, 0.255, 0.375, 0.625, 0.745, 0.865];
  ctx.fillStyle = 'rgba(232, 230, 222, 0.58)';
  for (let y = 8; y < h; y += 64) {
    laneU.forEach((u) => {
      ctx.fillRect(u * w - 1.5, y, 3, 28);
    });
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createGranitePromenadeTexture() {
  const s = 512;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d');

  // Granit gris-rosé Wilmotte (1994)
  ctx.fillStyle = '#ccc3b4';
  ctx.fillRect(0, 0, s, s);

  const cell = 32;
  for (let y = 0; y < s; y += cell) {
    for (let x = 0; x < s; x += cell) {
      const v = (((x * 13 + y * 29) >> 4) % 14) - 7;
      ctx.fillStyle = `rgb(${202 + v}, ${193 + v}, ${178 + v})`;
      ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
    }
  }

  // Bande contrastée sombre en bordure de promenade
  ctx.fillStyle = 'rgba(110, 102, 92, 0.14)';
  for (let y = 0; y < s; y += 64) {
    ctx.fillRect(0, y, s, 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 6);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createChampsGrandFacadeTexture() {
  const w = 512;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  // Pierre de taille parisienne blonde
  ctx.fillStyle = '#ece2cf';
  ctx.fillRect(0, 0, w, h);

  // Soubassement commercial prestige + entresol (bas de la façade)
  ctx.fillStyle = '#d4c6ae';
  ctx.fillRect(0, h * 0.72, w, h * 0.28);

  // Vitrines de luxe & arcades en rez-de-chaussée
  const cols = 8;
  const colW = w / cols;
  for (let col = 0; col < cols; col++) {
    const gx = col * colW + 8;
    const gw = colW - 16;
    ctx.fillStyle = '#1b222c';
    ctx.fillRect(gx, h * 0.76, gw, h * 0.22);
    ctx.strokeStyle = '#9a7e4a';
    ctx.lineWidth = 2;
    ctx.strokeRect(gx, h * 0.76, gw, h * 0.22);

    // 4 étages nobles + 1 étage de comble percé
    const floors = [0.58, 0.43, 0.28, 0.14];
    floors.forEach((fy, fIdx) => {
      const wy = h * fy;
      const wh = h * 0.105;
      ctx.fillStyle = '#333b46';
      ctx.fillRect(gx + 5, wy, gw - 10, wh);
      ctx.fillStyle = '#efe8da';
      ctx.fillRect(gx + 5, wy, 2, wh);
      ctx.fillRect(gx + gw - 7, wy, 2, wh);

      // Garde-corps en fer forgé sur les balcons des 2e & 5e étages
      if (fIdx === 0 || fIdx === 3) {
        ctx.fillStyle = '#24272c';
        ctx.fillRect(gx + 2, wy + wh - 6, gw - 4, 6);
      }
    });
  }

  // Bandeaux filants horizontaux en pierre sculptée
  [0.72, 0.56, 0.26, 0.08].forEach((ry) => {
    ctx.fillStyle = '#f6eedc';
    ctx.fillRect(0, h * ry, w, 5);
    ctx.fillStyle = 'rgba(110, 96, 74, 0.35)';
    ctx.fillRect(0, h * ry + 5, w, 2);
  });

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createChampsEmissiveVitrinesTexture() {
  const w = 512;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, w, h);

  const cols = 8;
  const colW = w / cols;
  for (let col = 0; col < cols; col++) {
    const gx = col * colW + 10;
    const gw = colW - 20;
    // Vitrines du rez-de-chaussée brillamment illuminées la nuit
    const grad = ctx.createLinearGradient(0, h * 0.77, 0, h * 0.97);
    grad.addColorStop(0, '#ffe3a8');
    grad.addColorStop(1, '#e8a84a');
    ctx.fillStyle = grad;
    ctx.fillRect(gx, h * 0.77, gw, h * 0.2);

    // Quelques fenêtres d'étage éclairées
    [0.58, 0.43, 0.28, 0.14].forEach((fy, fIdx) => {
      if ((col * 7 + fIdx * 5) % 3 !== 0) {
        ctx.fillStyle = (col + fIdx) % 2 === 0 ? '#ffd792' : '#ffbf6b';
        ctx.fillRect(gx + 4, h * fy + 3, gw - 8, h * 0.095);
      }
    });
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createChampsPaletteTexture() {
  const w = 512;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  // Grille 4x2 (8 nuances texturées -> 1 seul matériau fusionné)
  const swatches = [
    // Row 0 (haut du canvas)
    { col: 0, row: 0, base: '#a81c24', speckle: '#85131a' }, // Q0: Rouge carmin Fouquet's
    { col: 1, row: 0, base: '#214536', speckle: '#163125' }, // Q1: Bronze vert / kiosques Haussmann
    { col: 2, row: 0, base: '#c99375', speckle: '#ad785b' }, // Q2: Granit rose de Louxor (Obélisque)
    { col: 3, row: 0, base: '#62937e', speckle: '#4f7a68' }, // Q3: Vert céladon Ladurée
    // Row 1 (bas du canvas)
    { col: 0, row: 1, base: '#486d39', speckle: '#3c5c2f' }, // Q4: Gazon des Jardins
    { col: 1, row: 1, base: '#d4c8ae', speckle: '#bfb194' }, // Q5: Allées sablées
    { col: 2, row: 1, base: '#31353b', speckle: '#22262b' }, // Q6: Fonte anthracite
    { col: 3, row: 1, base: '#9c2a2a', speckle: '#7b1e1e' }, // Q7: Tapis rouge / terre cuite
  ];

  swatches.forEach(({ col, row, base, speckle }) => {
    const x0 = col * 128;
    const y0 = row * 128;
    ctx.fillStyle = base;
    ctx.fillRect(x0, y0, 128, 128);
    ctx.fillStyle = speckle;
    for (let i = 0; i < 180; i++) {
      const px = x0 + ((i * 53 + col * 19) % 122) + 3;
      const py = y0 + ((i * 89 + row * 23) % 122) + 3;
      ctx.fillRect(px, py, 3, 2);
    }
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Réaffecte les UVs d'une géométrie dans un swatch précis (col 0..3, row 0..1)
 * avec marge intérieure anti-bavure mipmap.
 */
function assignSwatchUVs(geo, col, row) {
  const uv = geo.attributes.uv;
  if (!uv) return geo;
  const u0 = col * 0.25 + 0.03;
  const u1 = (col + 1) * 0.25 - 0.03;
  // CanvasTexture flipY = true : row 0 -> haut [0.5, 1.0], row 1 -> bas [0.0, 0.5]
  const v0 = row === 0 ? 0.54 : 0.04;
  const v1 = row === 0 ? 0.96 : 0.46;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, THREE.MathUtils.lerp(u0, u1, uv.getX(i)), THREE.MathUtils.lerp(v0, v1, uv.getY(i)));
  }
  uv.needsUpdate = true;
  return geo;
}

function createMansardPrismGeo(w, h, d, inset = 1.6) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) > 0) {
      const sx = Math.sign(pos.getX(i));
      const sz = Math.sign(pos.getZ(i));
      pos.setX(i, pos.getX(i) - sx * Math.min(inset, w * 0.22));
      pos.setZ(i, pos.getZ(i) - sz * Math.min(inset, d * 0.22));
    }
  }
  geo.computeVertexNormals();
  return geo;
}

function buildSlopeRibbonGeo(sStart, sEnd, lxLeft, lxRight, yOffset, uScale = 1, vTileLen = 40, stepLen = 18) {
  const nLen = Math.max(2, Math.ceil((sEnd - sStart) / stepLen));
  const lxCols = [lxLeft, (lxLeft + lxRight) * 0.5, lxRight];
  const nW = lxCols.length;
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i <= nLen; i++) {
    const t = i / nLen;
    const s = THREE.MathUtils.lerp(sStart, sEnd, t);
    const vCoord = (s - sStart) / vTileLen;
    for (let j = 0; j < nW; j++) {
      const lx = lxCols[j];
      const y = elevAt(lx, s) + yOffset;
      positions.push(lx, y, s);
      uvs.push((j / (nW - 1)) * uScale, vCoord);
    }
  }

  for (let i = 0; i < nLen; i++) {
    for (let j = 0; j < nW - 1; j++) {
      const a = i * nW + j;
      const b = a + 1;
      const c = (i + 1) * nW + j;
      const d = c + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildSlopeQuadGeo(lxMin, lxMax, sMin, sMax, yOffset, uRep = 2, vRep = 2) {
  return buildSlopeRibbonGeo(sMin, sMax, lxMin, lxMax, yOffset, uRep, (sMax - sMin) / Math.max(1, vRep), 24);
}

// ============================================================================
// CONSTRUCTEUR PRINCIPAL DE L'AVENUE DES CHAMPS-ÉLYSÉES
// ============================================================================

export function buildChampsElyseesAxe(scene) {
  const root = new THREE.Group();
  root.name = 'AvenueChampsElyseesCompletes';
  root.position.set(ARC_X, 0, ARC_Z);
  root.rotation.y = CHAMPS_ROT_Y;
  root.updateMatrixWorld(true);
  scene.add(root);

  const champsStaticGroup = new THREE.Group();
  champsStaticGroup.name = 'ChampsElyseesStatique';
  root.add(champsStaticGroup);

  // --- 8 MATÉRIAUX STATIQUES FUSIONNÉS ---
  const matChampsCobble = new THREE.MeshStandardMaterial({
    map: createChampsCobbleRoadTexture(),
    roughness: 0.86,
    metalness: 0.04,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -2,
  });

  const matChampsGranite = new THREE.MeshStandardMaterial({
    map: createGranitePromenadeTexture(),
    roughness: 0.84,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const matChampsHaussmann = new THREE.MeshStandardMaterial({
    map: createChampsGrandFacadeTexture(),
    emissive: new THREE.Color(0xffc978),
    emissiveMap: createChampsEmissiveVitrinesTexture(),
    emissiveIntensity: 0.04,
    roughness: 0.78,
  });

  const matChampsClassicalStone = new THREE.MeshStandardMaterial({
    color: 0xebe2cf,
    roughness: 0.78,
    metalness: 0.03,
    emissive: new THREE.Color(0x000000),
  });

  const matChampsSlateZinc = new THREE.MeshStandardMaterial({
    color: 0x4b5868,
    roughness: 0.48,
    metalness: 0.18,
  });

  const matChampsPalette = new THREE.MeshStandardMaterial({
    map: createChampsPaletteTexture(),
    roughness: 0.82,
    metalness: 0.06,
  });

  const matChampsGold = new THREE.MeshStandardMaterial({
    color: 0xe3b857,
    roughness: 0.28,
    metalness: 0.84,
    emissive: new THREE.Color(0x4a330a),
    emissiveIntensity: 0.05,
  });

  const matChampsGlassWater = new THREE.MeshStandardMaterial({
    color: 0x3b8aa0,
    roughness: 0.15,
    metalness: 0.56,
    transparent: true,
    opacity: 0.78,
    side: THREE.DoubleSide,
  });

  function addStaticMesh(geo, mat, lx, y, lz, { ry = 0, rx = 0, cast = true, receive = true } = {}) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(lx, y, lz);
    if (ry) m.rotation.y = ry;
    if (rx) m.rotation.x = rx;
    m.castShadow = cast;
    m.receiveShadow = receive;
    champsStaticGroup.add(m);
    return m;
  }

  function addPaletteBox(w, h, d, col, row, lx, y, lz, opts = {}) {
    const geo = assignSwatchUVs(new THREE.BoxGeometry(w, h, d), col, row);
    return addStaticMesh(geo, matChampsPalette, lx, y, lz, opts);
  }

  function addPaletteCyl(rt, rb, h, seg, col, row, lx, y, lz, opts = {}) {
    const geo = assignSwatchUVs(new THREE.CylinderGeometry(rt, rb, h, seg), col, row);
    return addStaticMesh(geo, matChampsPalette, lx, y, lz, opts);
  }

  function addPaletteCone(r, h, seg, col, row, lx, y, lz, opts = {}) {
    const geo = assignSwatchUVs(new THREE.ConeGeometry(r, h, seg), col, row);
    return addStaticMesh(geo, matChampsPalette, lx, y, lz, opts);
  }

  /**
   * ==========================================================================
   * 1. CHAUSSÉE PAVÉE 2×4 VOIES, TROTTOIRS WILMOTTE & RUES TRANSVERSALES
   * ==========================================================================
   */
  // Chaussée pavée du Haut des Champs-Élysées (s = 82 .. 1108)
  champsStaticGroup.add(
    (() => {
      const m = new THREE.Mesh(buildSlopeRibbonGeo(82, 1108, -15, 15, 0.18, 1, 36, 16), matChampsCobble);
      m.castShadow = false;
      m.receiveShadow = true;
      return m;
    })()
  );
  // Chaussée pavée des Jardins jusqu'à l'entrée de la Concorde (s = 1248 .. 2005)
  champsStaticGroup.add(
    (() => {
      const m = new THREE.Mesh(buildSlopeRibbonGeo(1248, 2005, -15, 15, 0.18, 1, 36, 20), matChampsCobble);
      m.castShadow = false;
      m.receiveShadow = true;
      return m;
    })()
  );

  // Larges trottoirs-promenades Wilmotte en granit : 20 m sur le Haut (s = 136..1108), 14 m dans les Jardins (1248..1998)
  [-1, 1].forEach((side) => {
    const lxA = side > 0 ? 15 : -35;
    const lxB = side > 0 ? 35 : -15;
    const mHaut = new THREE.Mesh(buildSlopeRibbonGeo(136, 1108, lxA, lxB, 0.28, 2, 18, 16), matChampsGranite);
    mHaut.castShadow = false;
    mHaut.receiveShadow = true;
    champsStaticGroup.add(mHaut);

    const mRacc = new THREE.Mesh(
      buildSlopeRibbonGeo(84, 136, side > 0 ? 15 : -20, side > 0 ? 20 : -15, 0.25, 0.5, 18, 13),
      matChampsGranite
    );
    mRacc.castShadow = false;
    mRacc.receiveShadow = true;
    champsStaticGroup.add(mRacc);

    const lxJA = side > 0 ? 15 : -29;
    const lxJB = side > 0 ? 29 : -15;
    const mJard = new THREE.Mesh(buildSlopeRibbonGeo(1248, 1998, lxJA, lxJB, 0.28, 1.5, 18, 22), matChampsGranite);
    mJard.castShadow = false;
    mJard.receiveShadow = true;
    champsStaticGroup.add(mJard);
  });

  // Rues transversales majeures du Haut + passages piétons zébrés aux carrefours
  const crossStreets = [
    { s: 135, halfW: 9, span: 105 },   // Presbourg / Tilsitt
    { s: 310, halfW: 9, span: 112 },   // Galilée / Balzac
    { s: 485, halfW: 12, span: 125 },  // Avenue George-V / Washington
    { s: 675, halfW: 10, span: 112 },  // Pierre-Charron / Berri
    { s: 865, halfW: 11, span: 115 },  // Marbeuf / La Boétie
    { s: 1177.6, halfW: 14, span: 185 }, // Franklin-Roosevelt / Montaigne au Rond-Point
  ];

  crossStreets.forEach(({ s, halfW, span }) => {
    [-1, 1].forEach((side) => {
      const lxMin = side > 0 ? 34.5 : -span;
      const lxMax = side > 0 ? span : -34.5;
      const stMesh = new THREE.Mesh(buildSlopeQuadGeo(lxMin, lxMax, s - halfW, s + halfW, 0.16, 3, 1), matChampsCobble);
      stMesh.castShadow = false;
      stMesh.receiveShadow = true;
      champsStaticGroup.add(stMesh);

      const swN = new THREE.Mesh(buildSlopeQuadGeo(lxMin, lxMax, s + halfW, s + halfW + 4.5, 0.25, 3, 0.4), matChampsGranite);
      swN.castShadow = false;
      swN.receiveShadow = true;
      const swS = new THREE.Mesh(buildSlopeQuadGeo(lxMin, lxMax, s - halfW - 4.5, s - halfW, 0.25, 3, 0.4), matChampsGranite);
      swS.castShadow = false;
      swS.receiveShadow = true;
      champsStaticGroup.add(swN, swS);
    });
  });

  // Passages piétons & refuges centraux Wilmotte sur la chaussée
  [145, 300, 320, 473, 497, 665, 685, 855, 875, 1102, 1252, 1625, 1990].forEach((sz) => {
    const sy = elevAt(0, sz) + 0.21;
    // Refuge central
    addStaticMesh(new THREE.BoxGeometry(1.8, 0.14, 9.5), matChampsGranite, 0, sy + 0.04, sz, { cast: false });
    // Bandes blanches de passage piéton
    for (let bx = -12.8; bx <= 12.8; bx += 2.6) {
      if (Math.abs(bx) < 1.6) continue;
      addStaticMesh(new THREE.BoxGeometry(1.15, 0.06, 4.2), matChampsGranite, bx, sy, sz, { cast: false });
    }
  });

  // 8 Kiosques à journaux Haussmanniens verts & bancs sur les promenades
  [175, 390, 580, 795, 960, 1410, 1760, 1920].forEach((kz, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const kx = side * 22.5;
    const ky = elevAt(kx, kz) + 0.28;
    addPaletteCyl(1.45, 1.55, 3.1, 8, 1, 0, kx, ky + 1.55, kz);
    addPaletteCone(1.85, 1.4, 8, 1, 0, kx, ky + 3.8, kz);
    addStaticMesh(new THREE.BoxGeometry(3.2, 0.2, 1.9), matChampsGold, kx, ky + 3.1, kz, { cast: true });

    // Banc parisien juste à côté
    const bx = -side * 22.2;
    const by = elevAt(bx, kz) + 0.28;
    addPaletteBox(0.7, 0.45, 2.4, 2, 1, bx, by + 0.25, kz);
  });

  /**
   * ==========================================================================
   * 2. HAUT DES CHAMPS-ÉLYSÉES (s = 150 .. 1088) + ENSEIGNES EMBLÉMATIQUES
   * ==========================================================================
   */
  const blockIntervals = [
    [150, 294],
    [326, 468],
    [502, 658],
    [692, 848],
    [882, 1088],
  ];

  function addHaussmannFacadeBlock(sideSign, s0, s1, height, { skipMainBody = false, cornerRotondes = true } = {}) {
    const len = s1 - s0;
    const sMid = (s0 + s1) * 0.5;
    const depth = 21.0;
    const lxCenter = sideSign * (35.0 + depth * 0.5); // Face avant exactement à |lx| = 35 m
    const e0 = elevAt(lxCenter, s0);
    const e1 = elevAt(lxCenter, s1);
    const eMid = elevAt(lxCenter, sMid);
    const eMin = Math.min(e0, e1, eMid);
    const roofBaseY = Math.max(e0, e1, eMid) + height;
    const bodyBottomY = eMin - 3.0;
    const fullBodyH = roofBaseY - bodyBottomY;

    if (!skipMainBody) {
      const bodyGeo = new THREE.BoxGeometry(depth, fullBodyH, len);
      // Ajuster la répétition horizontale des fenêtres sur la longueur de l'îlot
      const uv = bodyGeo.attributes.uv;
      const repZ = Math.max(1, Math.round(len / 28));
      for (let i = 0; i < uv.count; i++) {
        uv.setX(i, uv.getX(i) * repZ);
      }
      uv.needsUpdate = true;
      addStaticMesh(bodyGeo, matChampsHaussmann, lxCenter, bodyBottomY + fullBodyH * 0.5, sMid);

      // Corniche en pierre calcaire + toit mansardé en zinc bleu-gris + souches de cheminées
      addStaticMesh(new THREE.BoxGeometry(depth + 0.9, 0.85, len + 0.9), matChampsClassicalStone, lxCenter, roofBaseY + 0.35, sMid);
      addStaticMesh(createMansardPrismGeo(depth - 0.8, 4.2, len - 0.8, 1.8), matChampsSlateZinc, lxCenter, roofBaseY + 2.8, sMid);
      for (let cz = s0 + 18; cz <= s1 - 18; cz += 26) {
        addStaticMesh(new THREE.BoxGeometry(2.2, 2.1, 1.4), matChampsClassicalStone, lxCenter, roofBaseY + 5.3, cz);
      }
    }

    if (cornerRotondes) {
      [s0 + 1.5, s1 - 1.5].forEach((rz) => {
        const rx = sideSign * 36.2;
        const rBase = elevAt(rx, rz) - 2.0;
        const rTop = elevAt(rx, rz) + height;
        const rH = rTop - rBase;
        addStaticMesh(new THREE.CylinderGeometry(4.6, 4.8, rH, 14), matChampsClassicalStone, rx, rBase + rH * 0.5, rz);
        addStaticMesh(
          new THREE.SphereGeometry(4.55, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
          matChampsSlateZinc,
          rx,
          rTop + 0.1,
          rz
        );
      });
    }
  }

  blockIntervals.forEach(([s0, s1], idx) => {
    // Côté Nord (pairs, lx = +35..+56) : îlots continus + h = 21,5..23,5 m
    addHaussmannFacadeBlock(+1, s0, s1, 21.8 + (idx % 2) * 1.6);

    // Côté Sud (impairs, lx = -35..-56) : tronçons spéciaux découpés autour des édifices emblématiques
    if (idx === 0) {
      // Bloc 1 Sud : Publicis Drugstore (150..208) + Haussmann (208..294)
      const pubBase = elevAt(-45, 179) - 2.5;
      const pubTop = elevAt(-45, 179) + 21.5;
      addStaticMesh(new THREE.BoxGeometry(20, pubTop - pubBase, 56), matChampsClassicalStone, -45.5, (pubBase + pubTop) * 0.5, 179);
      addStaticMesh(new THREE.CylinderGeometry(16, 16, 19.5, 20, 1, false, Math.PI * 0.12, Math.PI * 0.78), matChampsGlassWater, -39.5, pubTop - 10.5, 178, { cast: false });
      for (let pz = 154; pz <= 204; pz += 4.2) {
        addStaticMesh(new THREE.BoxGeometry(0.45, 19.2, 0.35), matChampsGold, -34.2, elevAt(-34.2, pz) + 9.8, pz);
      }
      addHaussmannFacadeBlock(-1, 208, 294, 22.0, { cornerRotondes: true });
    } else if (idx === 1) {
      // Bloc 2 Sud : Haussmann (326..420) + Le Fouquet's (420..468) angle George-V
      addHaussmannFacadeBlock(-1, 326, 420, 22.4, { cornerRotondes: false });
      const fqMid = 444;
      const fqBase = elevAt(-45, fqMid) - 2.5;
      const fqTop = elevAt(-45, fqMid) + 22.5;
      addStaticMesh(new THREE.BoxGeometry(21, fqTop - fqBase, 48), matChampsClassicalStone, -45.5, (fqBase + fqTop) * 0.5, fqMid);
      addStaticMesh(createMansardPrismGeo(20.2, 4.4, 47.2, 1.8), matChampsSlateZinc, -45.5, fqTop + 2.2, fqMid);
      // Stores rouge carmin emblématiques du Fouquet's + terrasse vitrée avancée sur la contre-allée
      addPaletteBox(2.2, 1.15, 46, 0, 0, -34.1, elevAt(-34.1, fqMid) + 4.4, fqMid);
      addPaletteBox(6.2, 0.38, 38, 0, 0, -31.8, elevAt(-31.8, fqMid) + 3.4, fqMid);
      addStaticMesh(new THREE.BoxGeometry(6.0, 2.8, 37.2), matChampsGlassWater, -31.8, elevAt(-31.8, fqMid) + 1.65, fqMid, { cast: false });
      addStaticMesh(new THREE.CylinderGeometry(4.8, 5.0, fqTop - fqBase + 0.5, 14), matChampsClassicalStone, -36.2, (fqBase + fqTop) * 0.5, 466.5);
      addStaticMesh(new THREE.SphereGeometry(4.75, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), matChampsSlateZinc, -36.2, fqTop + 0.4, 466.5);
    } else if (idx === 2) {
      // Bloc 3 Sud : Maison Louis Vuitton Art-Déco + Grande Coupole d'angle (502..562) + Haussmann & Ladurée (562..658)
      const lvMid = 532;
      const lvBase = elevAt(-45, lvMid) - 2.5;
      const lvTop = elevAt(-45, lvMid) + 23.5;
      addStaticMesh(new THREE.BoxGeometry(21, lvTop - lvBase, 60), matChampsClassicalStone, -45.5, (lvBase + lvTop) * 0.5, lvMid);
      addStaticMesh(createMansardPrismGeo(20.2, 4.2, 59.2, 1.6), matChampsSlateZinc, -45.5, lvTop + 2.1, lvMid);
      addStaticMesh(new THREE.BoxGeometry(0.6, 5.2, 56), matChampsGold, -34.7, elevAt(-34.7, lvMid) + 2.8, lvMid);
      // Grande Rotonde cylindrique LV d'angle George-V / Champs-Élysées à coupole étagée
      const rotElev = elevAt(-36.5, 505.5);
      addStaticMesh(new THREE.CylinderGeometry(7.2, 7.6, 26.5, 18), matChampsClassicalStone, -36.5, rotElev + 12.2, 505.5);
      addStaticMesh(new THREE.CylinderGeometry(7.9, 7.9, 0.9, 18), matChampsGold, -36.5, rotElev + 25.5, 505.5);
      addStaticMesh(new THREE.SphereGeometry(7.1, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.58), matChampsSlateZinc, -36.5, rotElev + 26.0, 505.5);
      addStaticMesh(new THREE.CylinderGeometry(0.25, 1.4, 3.8, 10), matChampsGold, -36.5, rotElev + 33.4, 505.5);

      addHaussmannFacadeBlock(-1, 562, 658, 22.0, { cornerRotondes: true });
      // Stores vert céladon de la Maison Ladurée (s = 612..654)
      addPaletteBox(2.2, 1.15, 38, 3, 0, -34.0, elevAt(-34.0, 633) + 4.3, 633);
      addPaletteBox(5.2, 0.35, 34, 3, 0, -32.2, elevAt(-32.2, 633) + 3.3, 633);
    } else if (idx === 3) {
      // Bloc 4 Sud : Galeries Lafayette Champs-Élysées (692..762) + Haussmann (762..848)
      addHaussmannFacadeBlock(-1, 692, 848, 22.8, { cornerRotondes: true });
      const glElev = elevAt(-34.6, 732);
      addStaticMesh(new THREE.BoxGeometry(1.2, 16.5, 42), matChampsClassicalStone, -34.6, glElev + 8.2, 732);
      addStaticMesh(new THREE.BoxGeometry(0.9, 13.5, 16), matChampsGlassWater, -34.1, glElev + 6.8, 732, { cast: false });
      addStaticMesh(new THREE.BoxGeometry(1.1, 1.2, 43), matChampsGold, -34.4, glElev + 16.6, 732);
    } else {
      addHaussmannFacadeBlock(-1, s0, s1, 21.8, { cornerRotondes: true });
    }
  });

  /**
   * ==========================================================================
   * 3. ROND-POINT DES CHAMPS-ÉLYSÉES-MARCEL-DASSAULT (s = 1177,6 m)
   * ==========================================================================
   */
  const rpZ = 1177.6;
  const rpElev = elevAt(0, rpZ);

  // Chaussée circulaire pavée (r = 34 .. 74 m)
  const rpRingGeo = new THREE.RingGeometry(34, 74, 48, 2);
  const rpUV = rpRingGeo.attributes.uv;
  for (let j = 0; j <= 2; j++) {
    for (let i = 0; i <= 48; i++) {
      rpUV.setXY(j * 49 + i, j / 2, (i / 48) * 10);
    }
  }
  rpRingGeo.rotateX(-Math.PI * 0.5);
  addStaticMesh(rpRingGeo, matChampsCobble, 0, rpElev + 0.21, rpZ, { cast: false });

  // Terre-plein central gazonné & bordure granit
  addStaticMesh(new THREE.CylinderGeometry(34, 34, 0.26, 36), matChampsGranite, 0, rpElev + 0.17, rpZ, { cast: false });
  addPaletteCyl(31, 31, 0.24, 32, 0, 1, 0, rpElev + 0.21, rpZ);

  // 6 Bassins des Fontaines du Rond-Point sur les angles extérieurs (r = 81 m)
  for (let f = 0; f < 6; f++) {
    const ang = (f + 0.5) * (Math.PI / 3);
    const fx = Math.cos(ang) * 81;
    const fz = rpZ + Math.sin(ang) * 81;
    const fe = elevAt(fx, fz);
    addStaticMesh(new THREE.CylinderGeometry(7.2, 7.6, 0.85, 20), matChampsClassicalStone, fx, fe + 0.42, fz);
    addStaticMesh(new THREE.CylinderGeometry(6.4, 6.4, 0.2, 20), matChampsGlassWater, fx, fe + 0.82, fz, { cast: false });
    addStaticMesh(new THREE.CylinderGeometry(0.55, 1.3, 3.6, 12), matChampsGold, fx, fe + 2.2, fz);
  }

  // Hôtels particuliers classiques ceinturant le Rond-Point (r = 95 m) + Théâtre du Rond-Point
  [Math.PI * 0.25, Math.PI * 0.75, -Math.PI * 0.25, -Math.PI * 0.75].forEach((ang, idx) => {
    const hx = Math.cos(ang) * 95;
    const hz = rpZ + Math.sin(ang) * 95;
    const he = elevAt(hx, hz);
    const rot = Math.atan2(-hx, rpZ - hz);
    addStaticMesh(new THREE.BoxGeometry(36, 18.5, 22), matChampsClassicalStone, hx, he + 9.2, hz, { ry: rot });
    addStaticMesh(createMansardPrismGeo(35, 3.8, 21, 1.5), matChampsSlateZinc, hx, he + 20.4, hz, { ry: rot });
    if (idx === 2) {
      // Théâtre du Rond-Point (rotonde vitrée & pierre légèrement au Sud-Est)
      addStaticMesh(new THREE.CylinderGeometry(18, 19, 14.5, 18), matChampsClassicalStone, -68, 7.2, 1265);
      addStaticMesh(new THREE.CylinderGeometry(14, 16, 4.2, 18), matChampsSlateZinc, -68, 16.5, 1265);
    }
  });

  /**
   * ==========================================================================
   * 4. JARDINS DES CHAMPS-ÉLYSÉES, WINSTON-CHURCHILL, PETIT & GRAND PALAIS
   * ==========================================================================
   */
  // Carrés verts des Jardins & Allées sablées transversales (lx ∈ [29, 132] & [-132, -29])
  const gardenZones = [
    { side: 1, s0: 1255, s1: 1580 },
    { side: 1, s0: 1620, s1: 1978 },
    { side: -1, s0: 1255, s1: 1625 },
    { side: -1, s0: 1775, s1: 1978 },
  ];
  gardenZones.forEach(({ side, s0, s1 }) => {
    const w = 98;
    const d = s1 - s0;
    const lx = side * (29 + w * 0.5);
    const lz = (s0 + s1) * 0.5;
    addPaletteBox(w, 0.18, d, 0, 1, lx, 0.06, lz);
    // Allée sablée longitudinale + allées croisées + bassin central
    addPaletteBox(8.5, 0.14, d - 16, 1, 1, lx, 0.14, lz);
    addPaletteBox(w - 16, 0.14, 7.5, 1, 1, lx, 0.14, lz);
    addStaticMesh(new THREE.CylinderGeometry(6.8, 7.1, 0.65, 18), matChampsClassicalStone, lx, 0.34, lz);
    addStaticMesh(new THREE.CylinderGeometry(5.9, 5.9, 0.18, 18), matChampsGlassWater, lx, 0.64, lz, { cast: false });
  });

  // 4 Pavillons historiques de Hittorff dans les Jardins (Marigny, Élysée, Ledoyen, Gabriel)
  [
    { lx: 68, lz: 1390, w: 32, d: 24, h: 12.5, rot: 0, rotunda: true },   // Théâtre Marigny
    { lx: 64, lz: 1715, w: 28, d: 20, h: 11.5, rot: 0, rotunda: false },  // Pavillon Élysée
    { lx: -68, lz: 1855, w: 36, d: 22, h: 13.0, rot: 0, rotunda: false }, // Pavillon Ledoyen
    { lx: 72, lz: 1895, w: 28, d: 20, h: 11.5, rot: 0, rotunda: false },  // Pavillon Gabriel
  ].forEach((p) => {
    if (p.rotunda) {
      addStaticMesh(new THREE.CylinderGeometry(16, 17, p.h, 20), matChampsClassicalStone, p.lx, p.h * 0.5 + 0.1, p.lz);
      addStaticMesh(new THREE.SphereGeometry(15.5, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), matChampsSlateZinc, p.lx, p.h, p.lz);
    } else {
      addStaticMesh(new THREE.BoxGeometry(p.w, p.h, p.d), matChampsClassicalStone, p.lx, p.h * 0.5 + 0.1, p.lz);
      addStaticMesh(createMansardPrismGeo(p.w - 0.8, 3.2, p.d - 0.8, 1.4), matChampsSlateZinc, p.lx, p.h + 1.7, p.lz);
    }
  });

  // Avenue Winston-Churchill reliant Champs-Élysées (-15, 1656) au Pont Alexandre-III (-409.4, 1701.4)
  const wcAx = -15, wcAz = 1656;
  const wcBx = -355, wcBz = 1696;
  const wcLen = Math.hypot(wcBx - wcAx, wcBz - wcAz);
  const wcCx = (wcAx + wcBx) * 0.5;
  const wcCz = (wcAz + wcBz) * 0.5;
  const wcRot = Math.atan2(wcBx - wcAx, wcBz - wcAz); // axe +Z le long de l'avenue
  addStaticMesh(new THREE.BoxGeometry(40, 0.22, wcLen), matChampsGranite, wcCx, 0.08, wcCz, { ry: wcRot, cast: false });
  addStaticMesh(new THREE.BoxGeometry(24, 0.20, wcLen), matChampsCobble, wcCx, 0.16, wcCz, { ry: wcRot, cast: false });

  // Petit Palais (centre (-175, 1738), façade principale de 124 m regardant Avenue Winston-Churchill)
  const ppG = new THREE.Group();
  ppG.position.set(-175, 0, 1738);
  ppG.rotation.y = wcRot + Math.PI * 0.5;
  champsStaticGroup.add(ppG);

  const addPP = (geo, mat, x, y, z, rx = 0, ry = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (rx) m.rotation.x = rx;
    if (ry) m.rotation.y = ry;
    m.castShadow = true;
    m.receiveShadow = true;
    ppG.add(m);
  };
  // Esplanade & socle
  addPP(new THREE.BoxGeometry(132, 0.4, 74), matChampsGranite, 0, 0.14, 0);
  // Façade Beaux-Arts principale & ailes symétriques autour du jardin semi-circulaire intérieur
  addPP(new THREE.BoxGeometry(124, 16.5, 16), matChampsClassicalStone, 0, 8.25, -24);
  addPP(new THREE.BoxGeometry(110, 15.0, 14), matChampsClassicalStone, 0, 7.5, 24);
  addPP(new THREE.BoxGeometry(16, 15.0, 48), matChampsClassicalStone, -54, 7.5, 0);
  addPP(new THREE.BoxGeometry(16, 15.0, 48), matChampsClassicalStone, 54, 7.5, 0);
  // Toitures ardoise des galeries
  addPP(createMansardPrismGeo(123, 3.6, 15.2, 1.4), matChampsSlateZinc, 0, 18.3, -24);
  addPP(createMansardPrismGeo(109, 3.2, 13.2, 1.2), matChampsSlateZinc, 0, 16.6, 24);
  // Grand Porche monumental central & Dôme central à lanterneau doré
  addPP(new THREE.BoxGeometry(28, 22, 22), matChampsClassicalStone, 0, 11.0, -25);
  addPP(new THREE.CylinderGeometry(8.5, 8.5, 5.5, 18, 1, false, 0, Math.PI), matChampsGold, 0, 12.5, -35.8, Math.PI * 0.5);
  addPP(new THREE.CylinderGeometry(11.2, 12.2, 9.5, 20), matChampsClassicalStone, 0, 22.0, -24);
  addPP(new THREE.SphereGeometry(11.0, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.56), matChampsSlateZinc, 0, 26.8, -24);
  addPP(new THREE.CylinderGeometry(0.45, 2.2, 5.2, 10), matChampsGold, 0, 39.2, -24);
  // Péristyle ionique de la façade
  for (let cx = -48; cx <= 48; cx += 8) {
    if (Math.abs(cx) < 15) continue;
    addPP(new THREE.CylinderGeometry(0.6, 0.72, 13.5, 10), matChampsClassicalStone, cx, 7.2, -33.2);
  }

  // Enrichissement du Grand Palais (centre (-223.3, 1524.4) : péristyle Est, crête d'or & 4 Quadriges vert-de-gris & or)
  const gpX = -223.3;
  const gpZ = 1524.4;
  // Grand Péristyle Est face à l'Avenue Winston-Churchill
  addStaticMesh(new THREE.BoxGeometry(72, 3.2, 12), matChampsClassicalStone, gpX, 20.5, 1618);
  for (let px = -30; px <= 30; px += 6) {
    addStaticMesh(new THREE.CylinderGeometry(0.75, 0.9, 17.5, 10), matChampsClassicalStone, gpX + px, 9.5, 1621.5);
  }
  // Crête & lanterneau dorés au faîte de la grande verrière
  addStaticMesh(new THREE.BoxGeometry(6.5, 2.2, 148), matChampsGold, gpX, 54.0, gpZ);
  addStaticMesh(new THREE.CylinderGeometry(1.2, 6.5, 7.5, 16), matChampsGold, gpX, 57.5, gpZ);
  // 4 Quadriges monumentaux aux angles (bronze vert-de-gris Q1 + auriges dorés)
  [
    [gpX - 38, 1612],
    [gpX + 38, 1612],
    [gpX - 38, 1436],
    [gpX + 38, 1436],
  ].forEach(([qx, qz]) => {
    addStaticMesh(new THREE.BoxGeometry(9.5, 5.2, 9.5), matChampsClassicalStone, qx, 24.4, qz);
    addPaletteBox(7.2, 3.6, 5.4, 1, 0, qx, 28.8, qz);
    addStaticMesh(new THREE.BoxGeometry(2.8, 3.8, 2.6), matChampsGold, qx, 31.2, qz);
  });

  /**
   * ==========================================================================
   * 5. PLACE DE LA CONCORDE, OBÉLISQUE DORÉ, FONTAINES & PALAIS DE GABRIEL
   * ==========================================================================
   */
  const concZ = 2122.5;
  // Grande esplanade octogonale/rectangulaire dallée en granit (224 × 236 m, sans chevaucher Tuileries)
  addStaticMesh(new THREE.BoxGeometry(224, 0.24, 236), matChampsGranite, 0, 0.03, concZ, { cast: false });
  // Couronne de circulation pavée autour de l'Obélisque & des fontaines
  const concRingGeo = new THREE.RingGeometry(24, 68, 48, 2);
  concRingGeo.rotateX(-Math.PI * 0.5);
  addStaticMesh(concRingGeo, matChampsCobble, 0, 0.19, concZ, { cast: false });

  // Obélisque de Louxor (centre exact de la Place de la Concorde)
  addStaticMesh(new THREE.BoxGeometry(11.5, 1.4, 11.5), matChampsGranite, 0, 0.7, concZ);
  addStaticMesh(new THREE.BoxGeometry(6.8, 8.2, 6.8), matChampsClassicalStone, 0, 5.5, concZ);
  addStaticMesh(new THREE.BoxGeometry(7.3, 0.85, 7.3), matChampsClassicalStone, 0, 9.8, concZ);
  // Cartouches dorés sur le piédestal
  addStaticMesh(new THREE.BoxGeometry(3.8, 4.4, 7.05), matChampsGold, 0, 5.5, concZ);
  addStaticMesh(new THREE.BoxGeometry(7.05, 4.4, 3.8), matChampsGold, 0, 5.5, concZ);
  // Fût monolithique en granit rose de Louxor (23 m) + Pyramidion doré (3.6 m)
  addPaletteCyl(0.88, 1.42, 23.0, 4, 2, 0, 0, 21.7, concZ, { ry: Math.PI * 0.25 });
  addStaticMesh(new THREE.ConeGeometry(0.9, 3.6, 4), matChampsGold, 0, 35.0, concZ, { ry: Math.PI * 0.25 });

  // Deux Fontaines monumentales de Hittorff (lx = ±48, lz = 2122.5)
  [-48, 48].forEach((fx) => {
    addStaticMesh(new THREE.CylinderGeometry(8.8, 9.4, 1.1, 24), matChampsClassicalStone, fx, 0.6, concZ);
    addStaticMesh(new THREE.CylinderGeometry(8.0, 8.0, 0.25, 24), matChampsGlassWater, fx, 1.12, concZ, { cast: false });
    addPaletteCyl(1.4, 2.2, 4.2, 14, 1, 0, fx, 3.1, concZ);
    addPaletteCyl(4.4, 1.1, 1.3, 18, 1, 0, fx, 5.3, concZ);
    addPaletteCyl(2.4, 0.7, 1.1, 16, 1, 0, fx, 7.4, concZ);
    addStaticMesh(new THREE.ConeGeometry(1.1, 2.6, 12), matChampsGold, fx, 9.1, concZ);
  });

  // 8 Pavillons octogonaux de Gabriel aux angles des fossés de la Place de la Concorde
  [
    [-98, concZ - 108], [98, concZ - 108],
    [-98, concZ - 42],  [98, concZ - 42],
    [-98, concZ + 42],  [98, concZ + 42],
    [-98, concZ + 108], [98, concZ + 108],
  ].forEach(([px, pz]) => {
    addStaticMesh(new THREE.CylinderGeometry(5.6, 6.2, 8.8, 8), matChampsClassicalStone, px, 4.5, pz);
    addStaticMesh(new THREE.CylinderGeometry(6.0, 6.0, 0.7, 8), matChampsGold, px, 9.1, pz);
    addStaticMesh(new THREE.BoxGeometry(3.2, 4.2, 3.2), matChampsClassicalStone, px, 11.4, pz);
  });

  // Chevaux de Marly (entrée Champs-Élysées, s = 1988) & Chevaux de Coysevox (entrée Tuileries, s = 2242)
  [1988, 2242].forEach((sz) => {
    [-19.5, 19.5].forEach((sx) => {
      addStaticMesh(new THREE.BoxGeometry(4.4, 5.2, 6.2), matChampsClassicalStone, sx, 2.6, sz);
      addStaticMesh(new THREE.BoxGeometry(2.2, 3.4, 4.2), matChampsClassicalStone, sx, 6.9, sz);
      addStaticMesh(new THREE.BoxGeometry(1.3, 2.8, 1.4), matChampsClassicalStone, sx, 9.6, sz + (sz < concZ ? -0.6 : 0.6));
    });
  });

  // Hôtel de Crillon (s = 2064) & Hôtel de la Marine (s = 2182) encadrant la Rue Royale au Nord (lx = +116)
  [2064, 2182].forEach((pz) => {
    const px = 116;
    // Corps néoclassique de Gabriel (76 × 21 × 22 m) tourné vers Place de la Concorde
    addStaticMesh(new THREE.BoxGeometry(20, 20.5, 76), matChampsClassicalStone, px + 2, 10.25, pz);
    addStaticMesh(new THREE.BoxGeometry(22, 0.9, 77.5), matChampsClassicalStone, px + 1, 20.8, pz);
    // Pavillons d'angle saillants à frontons & balustrade de toit
    [-29, 29].forEach((dz) => {
      addStaticMesh(new THREE.BoxGeometry(22.5, 22.0, 16.5), matChampsClassicalStone, px + 1, 11.0, pz + dz);
      addStaticMesh(new THREE.ConeGeometry(9.5, 4.8, 4), matChampsClassicalStone, px - 1.5, 24.4, pz + dz, { ry: Math.PI * 0.25 });
    });
    // Colonnade corinthienne géante (10 colonnes) devant la loggia centrale
    for (let cz = -18; cz <= 18; cz += 4.5) {
      addStaticMesh(new THREE.CylinderGeometry(0.55, 0.68, 13.5, 10), matChampsClassicalStone, px - 9.2, 13.5, pz + cz);
    }
    // Arcades de soubassement
    addStaticMesh(new THREE.BoxGeometry(3.5, 6.8, 76), matChampsClassicalStone, px - 8.5, 3.4, pz);
  });

  // Fusion statique par matériau -> 8 draw calls exactement !
  mergeStaticGroupByMaterial(champsStaticGroup);

  /**
   * ==========================================================================
   * 6. PLATANES TAILLÉS AU CARRÉ, CANDÉLABRES HISTORIQUES & TRAFIC ANIMÉ (8 DC)
   * ==========================================================================
   */
  // A. Platanes taillés (double allée Haut + quadruple allée Jardins + Winston-Churchill)
  const treeCoords = [];
  // Haut des Champs-Élysées (s = 152 .. 1085)
  for (let s = 152; s <= 1085; s += 26) {
    // Interrompre au niveau des carrefours
    if (crossStreets.some((cs) => Math.abs(s - cs.s) < cs.halfW + 7)) continue;
    [-29.5, -17.8, 17.8, 29.5].forEach((lx) => treeCoords.push({ lx, lz: s, boxTrim: true }));
  }
  // Jardins des Champs-Élysées (s = 1265 .. 1975)
  for (let s = 1265; s <= 1975; s += 28) {
    if (Math.abs(s - 1656) < 22) continue; // Percée Winston-Churchill
    [-33.5, -18.2, 18.2, 33.5].forEach((lx) => treeCoords.push({ lx, lz: s, boxTrim: false }));
  }
  // Avenue Winston-Churchill
  for (let t = 0.08; t <= 0.88; t += 0.11) {
    const wx = THREE.MathUtils.lerp(wcAx, wcBx, t);
    const wz = THREE.MathUtils.lerp(wcAz, wcBz, t);
    const nx = -(wcBz - wcAz) / wcLen;
    const nz = (wcBx - wcAx) / wcLen;
    [-16.2, 16.2].forEach((off) => treeCoords.push({ lx: wx + nx * off, lz: wz + nz * off, boxTrim: false }));
  }

  const champsTrunksInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.24, 0.36, 4.8, 6), matChampsPalette, treeCoords.length);
  const crownGeo = assignSwatchUVs(new THREE.BoxGeometry(5.2, 4.6, 5.2), 0, 1);
  // Légèrement biseauter/assouplir les sommets supérieurs du feuillage tout en gardant la taille architecturale Champs-Élysées
  const cPos = crownGeo.attributes.position;
  for (let i = 0; i < cPos.count; i++) {
    cPos.setX(i, cPos.getX(i) * (cPos.getY(i) > 0 ? 0.88 : 1.0));
    cPos.setZ(i, cPos.getZ(i) * (cPos.getY(i) > 0 ? 0.88 : 1.0));
  }
  crownGeo.computeVertexNormals();
  const trunkGeo = assignSwatchUVs(new THREE.CylinderGeometry(0.24, 0.36, 4.8, 6), 2, 1);
  champsTrunksInst.geometry.dispose();
  champsTrunksInst.geometry = trunkGeo;

  const champsCrownsInst = new THREE.InstancedMesh(crownGeo, matChampsPalette, treeCoords.length);
  champsTrunksInst.castShadow = false;
  champsCrownsInst.castShadow = false;
  champsCrownsInst.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const leafColor = new THREE.Color();
  treeCoords.forEach((tr, i) => {
    const ty = elevAt(tr.lx, tr.lz) + 0.25;
    const sc = tr.boxTrim ? 0.94 + (i % 4) * 0.04 : 1.08 + (i % 5) * 0.06;
    dummy.rotation.set(0, tr.boxTrim ? 0 : (i * 0.7) % Math.PI, 0);
    dummy.position.set(tr.lx, ty + 2.4, tr.lz);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    champsTrunksInst.setMatrixAt(i, dummy.matrix);

    dummy.position.set(tr.lx, ty + 6.4, tr.lz);
    dummy.scale.set(sc, sc * (tr.boxTrim ? 0.95 : 1.15), sc);
    dummy.updateMatrix();
    champsCrownsInst.setMatrixAt(i, dummy.matrix);

    const tint = 0.88 + ((i * 19) % 12) * 0.02;
    leafColor.setRGB(tint, tint * 1.06, tint * 0.9);
    champsCrownsInst.setColorAt(i, leafColor);
  });
  champsTrunksInst.instanceMatrix.needsUpdate = true;
  champsCrownsInst.instanceMatrix.needsUpdate = true;
  if (champsCrownsInst.instanceColor) champsCrownsInst.instanceColor.needsUpdate = true;
  root.add(champsTrunksInst, champsCrownsInst);

  // B. Candélabres parisiens historiques (bords de chaussée + Rond-Point + Concorde)
  const lampCoords = [];
  for (let s = 96; s <= 1985; s += 32) {
    if (Math.abs(s - rpZ) < 76) continue;
    [-15.8, 15.8].forEach((lx) => lampCoords.push({ lx, lz: s }));
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    lampCoords.push({ lx: Math.cos(a) * 76, lz: rpZ + Math.sin(a) * 76 });
  }
  [
    [-72, concZ - 72], [72, concZ - 72],
    [-72, concZ + 72], [72, concZ + 72],
    [-38, concZ - 95], [38, concZ - 95],
    [-38, concZ + 95], [38, concZ + 95],
  ].forEach(([lx, lz]) => lampCoords.push({ lx, lz }));

  const matLampPost = new THREE.MeshStandardMaterial({ color: 0x222726, roughness: 0.45, metalness: 0.55 });
  const matLampGlow = new THREE.MeshStandardMaterial({
    color: 0xfff5d6,
    emissive: new THREE.Color(0xffbd58),
    emissiveIntensity: 0.25,
    roughness: 0.2,
  });

  const champsPolesInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.11, 0.2, 5.2, 7), matLampPost, lampCoords.length);
  const champsGlobesInst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.42, 10, 8), matLampGlow, lampCoords.length);
  lampCoords.forEach((lp, i) => {
    const ly = elevAt(lp.lx, lp.lz) + 0.24;
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.position.set(lp.lx, ly + 2.6, lp.lz);
    dummy.updateMatrix();
    champsPolesInst.setMatrixAt(i, dummy.matrix);

    dummy.position.set(lp.lx, ly + 5.35, lp.lz);
    dummy.updateMatrix();
    champsGlobesInst.setMatrixAt(i, dummy.matrix);
  });
  champsPolesInst.instanceMatrix.needsUpdate = true;
  champsGlobesInst.instanceMatrix.needsUpdate = true;
  root.add(champsPolesInst, champsGlobesInst);

  // C. Trafic animé fluide des Champs-Élysées (24 véhicules sur 4 InstancedMesh)
  const matVehBody = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.34, metalness: 0.42 });
  const matVehGlass = new THREE.MeshStandardMaterial({ color: 0x243342, roughness: 0.2, metalness: 0.65 });
  const matVehHead = new THREE.MeshStandardMaterial({
    color: 0xfff8de,
    emissive: new THREE.Color(0xffe7a2),
    emissiveIntensity: 0.35,
    roughness: 0.2,
  });
  const matVehTail = new THREE.MeshStandardMaterial({
    color: 0xd92525,
    emissive: new THREE.Color(0xff2929),
    emissiveIntensity: 0.3,
    roughness: 0.25,
  });

  const vehCount = 24;
  const vehBodyInst = new THREE.InstancedMesh(new THREE.BoxGeometry(1.9, 1.05, 4.4), matVehBody, vehCount);
  const vehGlassInst = new THREE.InstancedMesh(new THREE.BoxGeometry(1.74, 0.56, 2.35), matVehGlass, vehCount);
  const vehHeadInst = new THREE.InstancedMesh(new THREE.BoxGeometry(1.52, 0.2, 0.12), matVehHead, vehCount);
  const vehTailInst = new THREE.InstancedMesh(new THREE.BoxGeometry(1.52, 0.2, 0.12), matVehTail, vehCount);
  [vehBodyInst, vehGlassInst, vehHeadInst, vehTailInst].forEach((inst) => {
    inst.frustumCulled = false;
    root.add(inst);
  });

  const carPalette = [0x1c222b, 0x2c3e55, 0x70232a, 0x3b4e43, 0x565d68, 0xd8dce0, 0x0f8a75];
  const carColor = new THREE.Color();
  const vehicles = [];

  for (let i = 0; i < vehCount; i++) {
    const dir = i < 12 ? 1 : -1; // dir=+1 (Concorde) à droite lx<0 | dir=-1 (Étoile) à droite lx>0
    const laneIdx = i % 2;
    const lx = dir > 0 ? -(4.4 + laneIdx * 5.2) : 4.4 + laneIdx * 5.2;
    const isBus = i % 7 === 0;
    const startZ = 100 + ((i * 157) % 1840);
    vehicles.push({
      lx,
      z: startZ,
      dir,
      speed: isBus ? 9.5 : 13.5 + (i % 4) * 1.8,
      scaleZ: isBus ? 2.15 : 1.0,
      scaleY: isBus ? 1.85 : 1.0,
      scaleX: isBus ? 1.25 : 1.0,
    });
    carColor.setHex(isBus ? 0x00a88f : carPalette[i % carPalette.length]);
    vehBodyInst.setColorAt(i, carColor);
  }
  if (vehBodyInst.instanceColor) vehBodyInst.instanceColor.needsUpdate = true;

  /**
   * ==========================================================================
   * 7. MISE À JOUR PAR IMAGE (PENTE AUTOMOBILE + ILLUMINATION + CULLING GPU)
   * ==========================================================================
   */
  const nightStoneMats = [matChampsClassicalStone];

  function update(dt, nightFactor = 0.1, cameraPos = null) {
    const clampedDt = Math.min(dt, 0.05);

    // Distance horizontale de la caméra au segment Étoile -> Concorde
    let distSeg = 0;
    if (cameraPos) {
      const segDx = CONC_X - ARC_X;
      const segDz = CONC_Z - ARC_Z;
      const l2 = segDx * segDx + segDz * segDz || 1;
      const t = Math.max(0, Math.min(1, ((cameraPos.x - ARC_X) * segDx + (cameraPos.z - ARC_Z) * segDz) / l2));
      const px = ARC_X + t * segDx;
      const pz = ARC_Z + t * segDz;
      distSeg = Math.hypot(cameraPos.x - px, cameraPos.z - pz);
    }

    // Masquage intelligent loin (Saint-Eustache = 1758 m) pour maintenir DC << 250
    champsPolesInst.visible = distSeg < 950;
    champsGlobesInst.visible = distSeg < 2400;
    const showTraffic = distSeg < 1450;
    vehBodyInst.visible = showTraffic;
    vehGlassInst.visible = showTraffic;
    vehHeadInst.visible = showTraffic;
    vehTailInst.visible = showTraffic;

    // Illumination nocturne des vitrines, façades classiques, candélabres et phares
    const lightsOn = Math.max(0, (nightFactor - 0.18) / 0.82);
    matChampsHaussmann.emissiveIntensity = 0.04 + lightsOn * 1.15;
    matLampGlow.emissiveIntensity = 0.22 + lightsOn * 1.55;
    matVehHead.emissiveIntensity = 0.35 + lightsOn * 3.0;
    matVehTail.emissiveIntensity = 0.3 + lightsOn * 2.5;
    matChampsGold.emissiveIntensity = 0.05 + lightsOn * 0.25;

    nightStoneMats.forEach((m) => {
      m.emissive.setHex(0xc88e42);
      m.emissiveIntensity = lightsOn * 0.22;
    });

    if (!showTraffic) return;

    for (let i = 0; i < vehCount; i++) {
      const v = vehicles[i];
      v.z += v.dir * v.speed * clampedDt;
      if (v.z > 1985) v.z = 92;
      if (v.z < 92) v.z = 1985;
      // Courbure C1 continue pour contourner le terre-plein central du Rond-Point
      let lx = v.lx;
      const dRp = Math.abs(v.z - rpZ);
      if (dRp < 74) {
        const arcPush = (0.5 + 0.5 * Math.cos((dRp / 74) * Math.PI)) * 38;
        lx = v.dir > 0 ? -(Math.abs(v.lx) + arcPush) : Math.abs(v.lx) + arcPush;
      }
      const vy = elevAt(lx, v.z) + 0.19;
      const pitch = -Math.atan((elevAt(lx, v.z + v.dir * 2.0) - elevAt(lx, v.z - v.dir * 2.0)) * 0.25);

      const yaw = v.dir > 0 ? 0 : Math.PI;
      dummy.rotation.set(pitch, yaw, 0, 'YXZ');

      dummy.position.set(lx, vy + 0.65 * v.scaleY, v.z);
      dummy.scale.set(v.scaleX, v.scaleY, v.scaleZ);
      dummy.updateMatrix();
      vehBodyInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(lx, vy + 1.18 * v.scaleY, v.z - v.dir * 0.15 * v.scaleZ);
      dummy.scale.set(v.scaleX, v.scaleY, v.scaleZ * (v.scaleZ > 1.5 ? 1.5 : 1.0));
      dummy.updateMatrix();
      vehGlassInst.setMatrixAt(i, dummy.matrix);

      const frontZ = v.z + v.dir * 2.22 * v.scaleZ;
      const backZ = v.z - v.dir * 2.22 * v.scaleZ;
      dummy.scale.set(v.scaleX, 1, 1);

      dummy.position.set(lx, vy + 0.65, frontZ);
      dummy.updateMatrix();
      vehHeadInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(lx, vy + 0.7, backZ);
      dummy.updateMatrix();
      vehTailInst.setMatrixAt(i, dummy.matrix);
    }

    vehBodyInst.instanceMatrix.needsUpdate = true;
    vehGlassInst.instanceMatrix.needsUpdate = true;
    vehHeadInst.instanceMatrix.needsUpdate = true;
    vehTailInst.instanceMatrix.needsUpdate = true;
  }

  return {
    root,
    update,
  };
}
