import * as THREE from 'three';
import { mergeStaticGroupByMaterial } from './perf-manager.js';
import {
  MONUMENTS,
  SEINE_POINTS,
  BRIDGES,
  gpsToMeters,
  getParisElevation,
  distanceToPolyline,
} from './paris-data.js';

/**
 * ============================================================================
 * SOCLE PARIS 3D À L'ÉCHELLE RÉELLE 1:1
 * - Terrain topographique de Paris (16 km × 14 km) avec relief naturel
 * - La Seine et ses quais + Île de la Cité & Île Saint-Louis + 8 grands ponts
 * - Axe historique Louvre – Tuileries – Concorde – Champs-Élysées – Étoile
 * - Jardin du Luxembourg & Bois de Boulogne
 * - ~2 200 îlots Haussmanniens simplifiés via 2 THREE.InstancedMesh (60 FPS)
 * - Silhouettes LOD reconnaissables des 10 monuments parisiens à venir
 * - 5 Bateaux-Mouches animés naviguant sur la Seine
 * ============================================================================
 */

function createCityHaussmannLODTexture() {
  const w = 512;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  // Pierre de taille lutétienne claire et lumineuse
  ctx.fillStyle = '#e8dfc9';
  ctx.fillRect(0, 0, w, h);

  // Assises horizontales fines
  ctx.fillStyle = 'rgba(110, 96, 76, 0.14)';
  for (let y = 0; y < h - 80; y += 18) {
    ctx.fillRect(0, y, w, 1.5);
  }

  // Rez-de-chaussée commerçant parisien
  ctx.fillStyle = '#3b342d';
  ctx.fillRect(0, h - 78, w, 78);
  for (let col = 0; col < 5; col++) {
    const sx = col * 100 + 14;
    ctx.fillStyle = '#252c34';
    ctx.fillRect(sx, h - 66, 76, 62);
    ctx.fillStyle = 'rgba(220, 185, 128, 0.28)';
    ctx.fillRect(sx + 6, h - 60, 64, 34);
  }

  // 5 étages de fenêtres françaises encadrées de pierre claire + balcons filants
  const rows = 5;
  const cols = 8;
  const cw = w / cols;
  for (let r = 0; r < rows; r++) {
    const fy = 20 + r * 80;
    ctx.fillStyle = '#d4c9b2';
    ctx.fillRect(0, fy + 66, w, 4);
    for (let col = 0; col < cols; col++) {
      const fx = col * cw + 14;
      ctx.fillStyle = '#f3ede2';
      ctx.fillRect(fx - 3, fy - 3, cw - 22, 60);
      ctx.fillStyle = '#293949';
      ctx.fillRect(fx, fy, cw - 28, 54);
      ctx.fillStyle = '#e5ded0';
      ctx.fillRect(fx + (cw - 28) * 0.5 - 1, fy, 2, 54);
      ctx.fillRect(fx, fy + 22, cw - 28, 2);
      ctx.fillStyle = '#262a2e';
      ctx.fillRect(fx - 1, fy + 44, cw - 26, 9);
    }
    if (r === 0 || r === 3) {
      ctx.fillStyle = '#262a2e';
      ctx.fillRect(0, fy + 48, w, 6);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createCityHaussmannEmissiveTexture() {
  const w = 512;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, w, h);

  // Vitrines commerçantes chaudes (60 % allumées)
  for (let col = 0; col < 5; col++) {
    if (col % 5 === 2) continue;
    const sx = col * 100 + 20;
    ctx.fillStyle = col % 2 === 0 ? '#ffd89c' : '#ffba66';
    ctx.fillRect(sx, h - 60, 64, 34);
  }

  // ~38 % des fenêtres d'appartements illuminées la nuit
  const rows = 5;
  const cols = 8;
  const cw = w / cols;
  const glowTones = ['#ffd89c', '#ffba66', '#ffe9c4'];
  for (let r = 0; r < rows; r++) {
    const fy = 20 + r * 80;
    for (let col = 0; col < cols; col++) {
      const hVal = (r * 17 + col * 31 + r * col * 7) % 13;
      if (hVal >= 5) continue;
      const fx = col * cw + 14;
      ctx.fillStyle = glowTones[hVal % glowTones.length];
      ctx.fillRect(fx + 2, fy + 3, cw - 32, 40);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createZincMansardTexture() {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d');

  // Zinc gris-bleu parisien lumineux à joints debout
  ctx.fillStyle = '#7c8d9e';
  ctx.fillRect(0, 0, s, s);

  for (let x = 0; x < s; x += 16) {
    ctx.fillStyle = '#637384';
    ctx.fillRect(x, 0, 2, s);
    ctx.fillStyle = '#93a4b5';
    ctx.fillRect(x + 2, 0, 1.5, s);
  }

  // Bande faîtière claire en haut (V ≈ 0.82..1.0)
  ctx.fillStyle = '#9aaabc';
  ctx.fillRect(0, 0, s, 44);
  ctx.fillStyle = '#5e6d7d';
  ctx.fillRect(0, 44, s, 4);

  // Petites lucarnes parisiennes stylisées sur le brisis
  for (let col = 0; col < 6; col++) {
    const lx = col * 42 + 12;
    ctx.fillStyle = '#d7ccb8';
    ctx.fillRect(lx - 2, 130, 18, 28);
    ctx.fillStyle = '#2d3b49';
    ctx.fillRect(lx + 1, 134, 12, 20);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createMansardRoofGeometry() {
  const b = 0.5;
  const tx = 0.34;
  const tz = 0.28;
  const b0 = [-b, -0.5, b];
  const b1 = [b, -0.5, b];
  const b2 = [b, -0.5, -b];
  const b3 = [-b, -0.5, -b];
  const t0 = [-tx, 0.5, tz];
  const t1 = [tx, 0.5, tz];
  const t2 = [tx, 0.5, -tz];
  const t3 = [-tx, 0.5, -tz];

  const pos = [];
  const uv = [];
  const pushQuad = (a, bPt, cPt, dPt, ua, va, ub, vb, uc, vc, ud, vd) => {
    pos.push(...a, ...bPt, ...cPt, ...a, ...cPt, ...dPt);
    uv.push(ua, va, ub, vb, uc, vc, ua, va, uc, vc, ud, vd);
  };

  // 4 pans brisis inclinés (CCW vus de l'extérieur) + terrasson supérieur
  pushQuad(b0, b1, t1, t0, 0, 0, 1, 0, 0.85, 0.78, 0.15, 0.78);
  pushQuad(b1, b2, t2, t1, 0, 0, 1, 0, 0.85, 0.78, 0.15, 0.78);
  pushQuad(b2, b3, t3, t2, 0, 0, 1, 0, 0.85, 0.78, 0.15, 0.78);
  pushQuad(b3, b0, t0, t3, 0, 0, 1, 0, 0.85, 0.78, 0.15, 0.78);
  pushQuad(t0, t1, t2, t3, 0, 0.84, 1, 0.84, 1, 1, 0, 1);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  return geo;
}

function createParisGroundTexture() {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  // Texture minérale homogène de pierre / granit urbain parisien (aucune fausse route peinte)
  ctx.fillStyle = '#b7b0a2';
  ctx.fillRect(0, 0, size, size);

  const cell = 32;
  for (let y = 0; y < size; y += cell) {
    for (let x = 0; x < size; x += cell) {
      const n = (((x * 17 + y * 31) >> 4) % 10) - 5;
      ctx.fillStyle = `rgb(${182 + n}, ${176 + n}, ${163 + n})`;
      ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
    }
  }

  for (let i = 0; i < 4200; i++) {
    const x = (i * 197) % size;
    const y = (i * 353 + Math.floor(i / 25) * 11) % size;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,250,240,0.055)' : 'rgba(35,32,28,0.055)';
    ctx.fillRect(x, y, 2, 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(96, 84);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createRiverRoadTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#33363c';
  ctx.fillRect(0, 0, 256, 512);

  // Bordures claires de trottoir
  ctx.fillStyle = '#a8a090';
  ctx.fillRect(0, 0, 14, 512);
  ctx.fillRect(242, 0, 14, 512);

  // Ligne médiane discontinue
  ctx.fillStyle = 'rgba(235, 232, 224, 0.72)';
  for (let y = 16; y < 512; y += 64) {
    ctx.fillRect(125, y, 6, 32);
  }

  // Grain asphalte
  for (let i = 0; i < 1600; i++) {
    const x = (i * 131) % 256;
    const y = (i * 257) % 512;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(x, y, 2, 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createMontparnasseTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const ctx = c.getContext('2d');

  // Façades verre fumé bronze-ardoise avec léger dégradé de reflet céleste (jamais noir pur à l'ombre)
  const bgGrad = ctx.createLinearGradient(0, 0, 0, 512);
  bgGrad.addColorStop(0, '#5a6a7d');
  bgGrad.addColorStop(0.45, '#465260');
  bgGrad.addColorStop(1, '#363f4b');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 256, 512);

  // 32 niveaux par tuile (allèges bronze-anthracite + bandeaux vitrés bleutés)
  const floorH = 16;
  for (let row = 0; row < 32; row++) {
    const y = row * floorH;
    const isTechFloor = row === 9 || row === 22;
    // Allège structurelle sombre
    ctx.fillStyle = isTechFloor ? '#262d36' : '#2e3640';
    ctx.fillRect(0, y, 256, isTechFloor ? 10 : 5);
    // Bandeau de fenêtres avec reflets de ciel nuancés par travée
    if (!isTechFloor) {
      for (let col = 0; col < 16; col++) {
        const x = col * 16;
        const shine = ((row * 13 + col * 29) % 7) / 7;
        const r = Math.round(78 + shine * 34);
        const g = Math.round(96 + shine * 42);
        const b = Math.round(118 + shine * 48);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x + 2, y + 6, 12, 9);
      }
    }
  }

  // Meneaux verticaux métalliques en aluminium brossé (signature visuelle de la Tour Montparnasse)
  for (let col = 0; col < 16; col++) {
    const x = col * 16;
    ctx.fillStyle = col % 4 === 0 ? '#788492' : '#5e6a76';
    ctx.fillRect(x, 0, col % 4 === 0 ? 2 : 1.2, 512);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createMontparnasseEmissiveTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 256, 512);

  const floorH = 16;
  for (let row = 0; row < 32; row++) {
    if (row === 9 || row === 22) continue;
    const y = row * floorH;
    const isTopDeck = row === 0 || row === 1;
    const floorLitProb = isTopDeck ? 0.92 : ((row * 19) % 5 === 0 ? 0.65 : 0.24);
    for (let col = 0; col < 16; col++) {
      const h = ((row * 37 + col * 73 + row * col * 11) % 100) / 100;
      if (h < floorLitProb) {
        ctx.fillStyle = isTopDeck ? '#ffe8b6' : (col % 3 === 0 ? '#ffd28e' : '#fff0cf');
        ctx.fillRect(col * 16 + 2, y + 6, 12, 8);
      }
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function computeSplineNormals(points) {
  const normals = [];
  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const tx = next.x - prev.x;
    const tz = next.z - prev.z;
    const len = Math.hypot(tx, tz) || 1;
    normals.push({ nx: -tz / len, nz: tx / len });
  }
  return normals;
}

// Crée un ruban horizontal continu entre offsetA et offsetB le long d'une polyline 2D
function createOffsetRibbonGeometry(points, offsetAFn, offsetBFn, yLevel, uvVScale = 24) {
  const positions = [];
  const uvs = [];
  const indices = [];
  const normals = computeSplineNormals(points);

  let accumDist = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const { nx, nz } = normals[i];
    if (i > 0) {
      accumDist += Math.hypot(p.x - points[i - 1].x, p.z - points[i - 1].z);
    }
    const oa = typeof offsetAFn === 'function' ? offsetAFn(i, p) : offsetAFn;
    const ob = typeof offsetBFn === 'function' ? offsetBFn(i, p) : offsetBFn;

    positions.push(p.x + nx * oa, yLevel, p.z + nz * oa);
    positions.push(p.x + nx * ob, yLevel, p.z + nz * ob);
    uvs.push(0, accumDist / uvVScale);
    uvs.push(1, accumDist / uvVScale);

    if (i < points.length - 1) {
      const base = i * 2;
      indices.push(base, base + 1, base + 2);
      indices.push(base + 1, base + 3, base + 2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}


// Crée un ruban de boulevard épousant le relief topographique de Paris (optionnellement en 2 bordures hors chaussée si innerHalfWidth > 0)
function createTerrainRibbonGeometry(points, halfWidth, yOffset = 0.02, uvVScale = 26, innerHalfWidth = 0) {
  const subdivided = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const segLen = Math.hypot(b.x - a.x, b.z - a.z);
    const steps = Math.max(1, Math.ceil(segLen / 30));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      subdivided.push({ x: THREE.MathUtils.lerp(a.x, b.x, t), z: THREE.MathUtils.lerp(a.z, b.z, t) });
    }
  }
  subdivided.push(points[points.length - 1]);

  const positions = [];
  const uvs = [];
  const indices = [];
  const normals = computeSplineNormals(subdivided);
  const bands = innerHalfWidth > 0
    ? [[-halfWidth, -innerHalfWidth], [innerHalfWidth, halfWidth]]
    : [[-halfWidth, halfWidth]];

  let vStart = 0;
  for (let bIdx = 0; bIdx < bands.length; bIdx++) {
    const [offA, offB] = bands[bIdx];
    let accumDist = 0;
    for (let i = 0; i < subdivided.length; i++) {
      const p = subdivided[i];
      const { nx, nz } = normals[i];
      if (i > 0) accumDist += Math.hypot(p.x - subdivided[i - 1].x, p.z - subdivided[i - 1].z);

      const ax = p.x + nx * offA;
      const az = p.z + nz * offA;
      const bx = p.x + nx * offB;
      const bz = p.z + nz * offB;
      positions.push(ax, getParisElevation(ax, az) + yOffset, az);
      positions.push(bx, getParisElevation(bx, bz) + yOffset, bz);
      uvs.push(0, accumDist / uvVScale, 1, accumDist / uvVScale);

      if (i < subdivided.length - 1) {
        const base = vStart + i * 2;
        indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
      }
    }
    vStart += subdivided.length * 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}


// Crée une ellipse/parc subdivisée épousant exactement le relief de Paris (zéro découpe sur les pentes !)
function createTerrainEllipseGeometry(cx, cz, rx, rz, rotY = 0, yOffset = 0.14, rings = 7, segs = 28) {
  const cosR = Math.cos(rotY);
  const sinR = Math.sin(rotY);
  const positions = [];
  const uvs = [];
  const indices = [];

  positions.push(cx, getParisElevation(cx, cz) + yOffset, cz);
  uvs.push(0.5, 0.5);

  for (let r = 1; r <= rings; r++) {
    const frac = r / rings;
    // Bord légèrement abaissé pour fondre l'herbe dans le relief sans marche ni z-fighting
    const edgeOff = r === rings ? yOffset * 0.45 : yOffset;
    for (let s = 0; s < segs; s++) {
      const a = (s / segs) * Math.PI * 2;
      const lx = Math.cos(a) * rx * frac;
      const lz = Math.sin(a) * rz * frac;
      const wx = cx + lx * cosR + lz * sinR;
      const wz = cz - lx * sinR + lz * cosR;
      positions.push(wx, getParisElevation(wx, wz) + edgeOff, wz);
      uvs.push(0.5 + 0.5 * frac * Math.cos(a), 0.5 + 0.5 * frac * Math.sin(a));
    }
  }

  for (let s = 0; s < segs; s++) {
    const cur = 1 + s;
    const next = 1 + ((s + 1) % segs);
    indices.push(0, next, cur);
  }
  for (let r = 1; r < rings; r++) {
    const r0 = 1 + (r - 1) * segs;
    const r1 = 1 + r * segs;
    for (let s = 0; s < segs; s++) {
      const sNext = (s + 1) % segs;
      const i00 = r0 + s;
      const i01 = r0 + sNext;
      const i10 = r1 + s;
      const i11 = r1 + sNext;
      indices.push(i00, i01, i10, i01, i11, i10);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// Crée un rectangle subdivisé épousant le relief (squares de quartier & cours jardins sur collines)
function createTerrainRectGeometry(cx, cz, w, d, rotY = 0, yOffset = 0.14, segs = 4) {
  const cosR = Math.cos(rotY);
  const sinR = Math.sin(rotY);
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let iz = 0; iz <= segs; iz++) {
    const vz = iz / segs;
    const lz = (vz - 0.5) * d;
    for (let ix = 0; ix <= segs; ix++) {
      const vx = ix / segs;
      const lx = (vx - 0.5) * w;
      const wx = cx + lx * cosR + lz * sinR;
      const wz = cz - lx * sinR + lz * cosR;
      positions.push(wx, getParisElevation(wx, wz) + yOffset, wz);
      uvs.push(vx, vz);
    }
  }
  const stride = segs + 1;
  for (let iz = 0; iz < segs; iz++) {
    for (let ix = 0; ix < segs; ix++) {
      const p00 = iz * stride + ix;
      const p10 = p00 + 1;
      const p01 = p00 + stride;
      const p11 = p01 + 1;
      indices.push(p00, p01, p10, p01, p11, p10);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// Crée un mur de quai en 3D (paroi verticale immergée jusqu'à yBottom + trottoir plat jusqu'à outerOffset)
function createEmbankmentSideGeometry(points, innerFn, outerFn, yBottom, yTop, sideSign) {
  const positions = [];
  const uvs = [];
  const indices = [];
  const normals = computeSplineNormals(points);

  let accumDist = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const { nx, nz } = normals[i];
    if (i > 0) {
      accumDist += Math.hypot(p.x - points[i - 1].x, p.z - points[i - 1].z);
    }
    const iw = (typeof innerFn === 'function' ? innerFn(i, p) : innerFn) * sideSign;
    const ow = (typeof outerFn === 'function' ? outerFn(i, p) : outerFn) * sideSign;
    const footW = iw - sideSign * 1.2;
    const skirtW = ow + sideSign * 2.0;

    // 4 sommets par station : pied immergé -> arête haute parapet -> bord extérieur quai -> jupe enfouie
    positions.push(p.x + nx * footW, yBottom, p.z + nz * footW);
    positions.push(p.x + nx * iw, yTop, p.z + nz * iw);
    positions.push(p.x + nx * ow, yTop, p.z + nz * ow);
    positions.push(p.x + nx * skirtW, -0.85, p.z + nz * skirtW);

    const vCoord = accumDist / 40;
    uvs.push(0.0, vCoord, 0.2, vCoord, 0.9, vCoord, 1.0, vCoord);

    if (i < points.length - 1) {
      const b0 = i * 4;
      const b1 = (i + 1) * 4;
      for (let k = 0; k < 3; k++) {
        indices.push(b0 + k, b0 + k + 1, b1 + k);
        indices.push(b0 + k + 1, b1 + k + 1, b1 + k);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}


// Crée une île (Île de la Cité / Île Saint-Louis) avec parois verticales immergées tout autour
function createIslandWithWallsGeometry(points, halfWidthFn, yBottom, yTop) {
  const positions = [];
  const uvs = [];
  const indices = [];
  const normals = computeSplineNormals(points);

  let accumDist = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const { nx, nz } = normals[i];
    if (i > 0) {
      accumDist += Math.hypot(p.x - points[i - 1].x, p.z - points[i - 1].z);
    }
    const hw = typeof halfWidthFn === 'function' ? halfWidthFn(i, p) : halfWidthFn;
    // 4 sommets par coupe : pied gauche (-hw), quai gauche (-hw), quai droit (+hw), pied droit (+hw)
    positions.push(p.x - nx * (hw + 0.8), yBottom, p.z - nz * (hw + 0.8));
    positions.push(p.x - nx * hw, yTop, p.z - nz * hw);
    positions.push(p.x + nx * hw, yTop, p.z + nz * hw);
    positions.push(p.x + nx * (hw + 0.8), yBottom, p.z + nz * (hw + 0.8));

    const vCoord = accumDist / 40;
    uvs.push(0.0, vCoord, 0.15, vCoord, 0.85, vCoord, 1.0, vCoord);

    if (i < points.length - 1) {
      const b0 = i * 4;
      const b1 = (i + 1) * 4;
      for (let k = 0; k < 3; k++) {
        indices.push(b0 + k, b0 + k + 1, b1 + k);
        indices.push(b0 + k + 1, b1 + k + 1, b1 + k);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}


// Crée la géométrie d'eau de la Seine (u lateral 0..1 pour connaître la proximité des berges dans le shader)
function createRiverRibbonGeometry(points, halfWidthFn, yLevel) {
  return createOffsetRibbonGeometry(
    points,
    (i, p) => -(typeof halfWidthFn === 'function' ? halfWidthFn(i, p) : halfWidthFn),
    (i, p) => +(typeof halfWidthFn === 'function' ? halfWidthFn(i, p) : halfWidthFn),
    yLevel,
    120
  );
}

export function buildParisWorld(scene) {
  const worldGroup = new THREE.Group();
  worldGroup.name = 'ParisWorld1to1';
  scene.add(worldGroup);

  const emissiveNightMaterials = [];

  // Matériaux partagés Paris
  const matGround = new THREE.MeshStandardMaterial({
    map: createParisGroundTexture(),
    roughness: 0.94,
    metalness: 0.02,
  });

  // Shader GLSL animé de la Seine (vagues multi-octaves, Fresnel, reflet solaire & nocturne sans scintillement)
  const waterMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSunDir: { value: new THREE.Vector3(0.5, 0.7, 0.45).normalize() },
      uNightFactor: { value: 0.0 },
      uSkyHorizon: { value: new THREE.Color(0xa6c4db) },
      uSkyZenith: { value: new THREE.Color(0x4779a8) },
      uFogColor: { value: new THREE.Color(0xcfdce8) },
      uFogDensity: { value: 0.00018 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPos;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uSunDir;
      uniform float uNightFactor;
      uniform vec3 uSkyHorizon;
      uniform vec3 uSkyZenith;
      uniform vec3 uFogColor;
      uniform float uFogDensity;

      varying vec3 vWorldPos;
      varying vec2 vUv;

      void main() {
        vec3 p = vWorldPos;
        float t = uTime;
        float camDist = length(cameraPosition - p);
        float detailFade = 1.0 - smoothstep(180.0, 2400.0, camDist);

        float w1 = sin(p.x * 0.16 + p.z * 0.11 + t * 1.35) * cos(p.z * 0.14 - t * 1.05);
        float w2 = sin(p.x * 0.38 - p.z * 0.27 + t * 2.1);
        float nxW = cos(p.x * 0.16 + p.z * 0.11 + t * 1.35) * 0.042 + cos(p.x * 0.38 - p.z * 0.27 + t * 2.1) * 0.026;
        float nzW = cos(p.x * 0.13 + p.z * 0.22 - t * 1.25) * 0.042 - cos(p.x * 0.38 - p.z * 0.27 + t * 2.1) * 0.024;
        vec3 N = normalize(vec3(nxW * detailFade, 1.0, nzW * detailFade));

        vec3 V = normalize(cameraPosition - p);
        float NoV = max(dot(N, V), 0.0);
        float fresnel = clamp(pow(1.0 - NoV, 3.2) * 0.85 + 0.06, 0.0, 1.0);

        vec3 R = reflect(-V, N);
        float rSky = clamp(R.y, 0.0, 1.0);
        vec3 skyRefl = mix(uSkyHorizon, uSkyZenith, pow(rSky, 0.65));

        float edgeDist = smoothstep(0.0, 0.16, vUv.x) * (1.0 - smoothstep(0.84, 1.0, vUv.x));
        vec3 dayShallow = vec3(0.09, 0.24, 0.27);
        vec3 dayDeep = vec3(0.07, 0.19, 0.26);
        vec3 waterDay = mix(dayShallow, dayDeep, edgeDist) + vec3(0.015, 0.025, 0.025) * w1 * detailFade;
        vec3 waterNight = vec3(0.018, 0.04, 0.065);
        vec3 waterBody = mix(waterDay, waterNight, uNightFactor);

        vec3 col = mix(waterBody, skyRefl, fresnel * 0.72);

        vec3 L = normalize(uSunDir);
        float sunVis = smoothstep(-0.04, 0.15, L.y);
        float specPow = mix(115.0, 36.0, 1.0 - detailFade);
        float spec = pow(max(dot(R, L), 0.0), specPow);
        vec3 sunCol = mix(vec3(1.0, 0.68, 0.36), vec3(1.0, 0.96, 0.88), clamp(L.y * 2.6, 0.0, 1.0));
        col += sunCol * spec * sunVis * 1.15 * (0.45 + 0.55 * detailFade);

        // Reflets chauds des réverbères parisiens le long des quais la nuit
        float bankShimmer = (1.0 - edgeDist * 0.7) * uNightFactor * (0.45 + 0.55 * clamp(w1 + w2 * 0.5, 0.0, 1.0));
        col += vec3(1.0, 0.68, 0.3) * bankShimmer * 0.42;

        float fogFactor = clamp(1.0 - exp(-uFogDensity * uFogDensity * camDist * camDist), 0.0, 1.0);
        col = mix(col, uFogColor, fogFactor);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  const matQuayStone = new THREE.MeshStandardMaterial({
    color: 0xbeb5a4,
    roughness: 0.86,
    side: THREE.DoubleSide,
  });
  const matRiverRoad = new THREE.MeshStandardMaterial({
    map: createRiverRoadTexture(),
    roughness: 0.88,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -4,
  });
  const matRoadJunction = new THREE.MeshStandardMaterial({
    color: 0x33363c,
    roughness: 0.88,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -6,
  });
  const matBridgeStone = new THREE.MeshStandardMaterial({
    color: 0xd9cfbc,
    roughness: 0.8,
  });
  const matParkLawn = new THREE.MeshStandardMaterial({
    color: 0x4b6e3b,
    roughness: 0.92,
  });
  const matParkPath = new THREE.MeshStandardMaterial({
    color: 0xd3c8b2,
    roughness: 0.88,
  });
  const matCanalWater = new THREE.MeshStandardMaterial({
    color: 0x24586a,
    roughness: 0.22,
    metalness: 0.32,
  });
  const matAvenueAsphalt = new THREE.MeshStandardMaterial({
    color: 0x3b3e44,
    roughness: 0.9,
  });
  const matParisWhite = new THREE.MeshStandardMaterial({
    color: 0xefeae0,
    roughness: 0.72,
  });
  const matLimestone = new THREE.MeshStandardMaterial({
    color: 0xded3be,
    roughness: 0.82,
  });
  const matSlate = new THREE.MeshStandardMaterial({
    color: 0x343e4c,
    roughness: 0.6,
    metalness: 0.2,
  });
  const matPatinaCopper = new THREE.MeshStandardMaterial({
    color: 0x4d7e6f,
    roughness: 0.48,
    metalness: 0.35,
  });
  const matGold = new THREE.MeshStandardMaterial({
    color: 0xd9a84e,
    roughness: 0.3,
    metalness: 0.82,
  });
  const matGlassLOD = new THREE.MeshStandardMaterial({
    color: 0x8db6cf,
    roughness: 0.16,
    metalness: 0.55,
    transparent: true,
    opacity: 0.68,
    side: THREE.DoubleSide,
  });

  // Élargissement naturel autour de l'Île Saint-Louis (2), Île de la Cité (3) et Pont Neuf (4)
  const seineWidthFn = (i) => (i === 2 ? 142 : i === 3 ? 152 : i === 4 ? 128 : 74);

  function getSeineDistAndHalfWidth(wx, wz) {
    let minSq = Infinity;
    let bestHw = 74;
    for (let i = 0; i < SEINE_POINTS.length - 1; i++) {
      const a = SEINE_POINTS[i];
      const b = SEINE_POINTS[i + 1];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const lenSq = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((wx - a.x) * dx + (wz - a.z) * dz) / lenSq));
      const px = a.x + t * dx;
      const pz = a.z + t * dz;
      const dSq = (wx - px) ** 2 + (wz - pz) ** 2;
      if (dSq < minSq) {
        minSq = dSq;
        bestHw = THREE.MathUtils.lerp(seineWidthFn(i), seineWidthFn(i + 1), t);
      }
    }
    return { dist: Math.sqrt(minSq), hw: bestHw };
  }

  /**
   * ==========================================================================
   * 1. GRAND TERRAIN TOPOGRAPHIQUE DE PARIS (16 000 m × 14 000 m) + LIT CREUSÉ
   * ==========================================================================
   */
  const tourEiffelCenter = gpsToMeters(48.8584, 2.2945); // (-3694, +556)
  const eiffelInvRot = -Math.atan2(136, 141);
  const cosEI = Math.cos(eiffelInvRot);
  const sinEI = Math.sin(eiffelInvRot);

  const garnierCenter = gpsToMeters(48.8720, 2.3316); // (-980, -956)
  const garnierInvRot = -Math.atan2(58, 178);
  const cosGI = Math.cos(garnierInvRot);
  const sinGI = Math.sin(garnierInvRot);
  const toGarnierLocal = (x, z) => {
    const dx = x - garnierCenter.x;
    const dz = z - garnierCenter.z;
    return {
      lx: dx * cosGI + dz * sinGI,
      lz: -dx * sinGI + dz * cosGI,
    };
  };

  const notreDameCenter = gpsToMeters(48.8530, 2.3499); // (+358, +1156)
  const ndRot = -0.6727;
  const cosND = Math.cos(ndRot);
  const sinND = Math.sin(ndRot);
  const toNotreDameLocal = (x, z) => {
    const dx = x - notreDameCenter.x;
    const dz = z - notreDameCenter.z;
    return {
      lx: dx * cosND - dz * sinND,
      lz: dx * sinND + dz * cosND,
    };
  };

  const groundGeo = new THREE.PlaneGeometry(16000, 14000, 256, 224);
  groundGeo.rotateX(-Math.PI * 0.5);
  const posAttr = groundGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    const wx = vx - 1800;
    const wz = vz - 200;

    const rawElev = getParisElevation(wx, wz);
    // -0,06 m sur Paris plat (routes au ras du sol) ; creusement léger sur pentes pour compenser la corde 62,5 m
    const slopeDip = 0.20 * THREE.MathUtils.smoothstep(rawElev, 0.25, 3.8);
    let elev = rawElev - 0.06 - slopeDip;

    // Dépression locale à -0,38 m (avec transition 18 m) sous les dalles basses Saint-Eustache, Tour Eiffel & Palais Garnier
    const eustRectD = Math.max(
      Math.min(
        Math.max(-144 - wx, wx - 140, -116 - wz, wz - 146),
        Math.max(-20 - wx, wx - 92, -156 - wz, wz + 116)
      ),
      0
    );
    const eustBlend = 1.0 - THREE.MathUtils.smoothstep(eustRectD, 0, 18);

    const edx = wx - tourEiffelCenter.x;
    const edz = wz - tourEiffelCenter.z;
    const elx = edx * cosEI + edz * sinEI;
    const elz = -edx * sinEI + edz * cosEI;
    const eiffRectD = Math.max(Math.abs(elx) - 248, -648 - elz, elz - 895, 0);
    const eiffBlend = 1.0 - THREE.MathUtils.smoothstep(eiffRectD, 0, 18);

    const { lx: glx, lz: glz } = toGarnierLocal(wx, wz);
    const garnierRectD = Math.max(Math.abs(glx) - 102, -108 - glz, glz - 220, 0);
    const garnierBlend = 1.0 - THREE.MathUtils.smoothstep(garnierRectD, 0, 18);

    const localDepress = Math.max(eustBlend, eiffBlend, garnierBlend);
    elev = THREE.MathUtils.lerp(elev, rawElev - 0.38, localDepress);

    const { dist, hw } = getSeineDistAndHalfWidth(wx, wz);
    if (dist < hw + 2) {
      elev = -5.8;
    } else if (dist < hw + 22) {
      const blend = THREE.MathUtils.smoothstep(dist, hw + 2, hw + 22);
      elev = THREE.MathUtils.lerp(-5.8, elev, blend);
    }
    posAttr.setY(i, elev);
  }
  groundGeo.computeVertexNormals();
  const parisGround = new THREE.Mesh(groundGeo, matGround);
  parisGround.position.set(-1800, 0, -200);
  parisGround.receiveShadow = true;
  worldGroup.add(parisGround);

  /**
   * ==========================================================================
   * 2. LA SEINE, QUAIS 3D, VOIES SUR BERGES, ÎLES MURÉES & GRANDS PONTS
   * ==========================================================================
   */
  const staticCityLandmarks = new THREE.Group();
  staticCityLandmarks.name = 'ParisStaticCityLandmarks';
  worldGroup.add(staticCityLandmarks);

  // Berges 3D rive droite & rive gauche (paroi immergée jusqu'à -5,8 m + promenade de plain-pied à +0,20 m)
  [-1, 1].forEach((sideSign) => {
    const bankGeo = createEmbankmentSideGeometry(
      SEINE_POINTS,
      seineWidthFn,
      (i) => seineWidthFn(i) + 25,
      -5.8,
      0.20,
      sideSign
    );
    const bankMesh = new THREE.Mesh(bankGeo, matQuayStone);
    bankMesh.receiveShadow = true;
    staticCityLandmarks.add(bankMesh);

    // Voies sur berges courbes continues longeant les deux rives à niveau avec les avenues (y = +0,28 m)
    const roadGeo = createOffsetRibbonGeometry(
      SEINE_POINTS,
      (i) => sideSign * (seineWidthFn(i) + 5.5),
      (i) => sideSign * (seineWidthFn(i) + 19.5),
      0.28,
      22
    );
    const roadMesh = new THREE.Mesh(roadGeo, matRiverRoad);
    roadMesh.receiveShadow = true;
    staticCityLandmarks.add(roadMesh);
  });

  // Eau animée de la Seine nettement séparée du lit (-5,8 m) et des quais (+0,45 m)
  const riverGeo = createRiverRibbonGeometry(SEINE_POINTS, seineWidthFn, -2.2);
  const riverMesh = new THREE.Mesh(riverGeo, waterMat);
  riverMesh.frustumCulled = false;
  worldGroup.add(riverMesh);

  // Île de la Cité (autour de Notre-Dame : (+358, +1156) jusqu'au Pont Neuf (-263, +700))
  const citePts = [
    gpsToMeters(48.8576, 2.3408), // Square du Vert-Galant (pointe Ouest)
    gpsToMeters(48.8555, 2.3455), // Palais de Justice / Sainte-Chapelle
    gpsToMeters(48.8530, 2.3499), // Parvis & Notre-Dame
    gpsToMeters(48.8516, 2.3528), // Square Jean-XXIII (pointe Est)
  ];
  const citeGeo = createIslandWithWallsGeometry(citePts, (i) => (i === 0 ? 32 : i === 3 ? 48 : 78), -5.8, 0.45);
  const citeMesh = new THREE.Mesh(citeGeo, matQuayStone);
  citeMesh.receiveShadow = true;
  staticCityLandmarks.add(citeMesh);

  // Île Saint-Louis (juste à l'Est de l'Île de la Cité, bien centrée entre les deux bras de Seine)
  const stLouisPts = [
    { x: 665, z: 1274 },
    { x: 915, z: 1378 },
    { x: 1150, z: 1515 },
  ];
  const stLouisGeo = createIslandWithWallsGeometry(stLouisPts, (i) => (i === 1 ? 60 : 32), -5.8, 0.45);
  const stLouisMesh = new THREE.Mesh(stLouisGeo, matQuayStone);
  stLouisMesh.receiveShadow = true;
  staticCityLandmarks.add(stLouisMesh);

  // Grands Ponts sur la Seine (le Pont d'Iéna est modélisé en détail dans tour-eiffel.js)
  BRIDGES.forEach((b) => {
    const bPos = gpsToMeters(b.lat, b.lon);
    // Trouve l'angle tangent exact en projetant sur le segment le plus proche de la Seine
    let bestAngle = 0;
    let bestDistSq = Infinity;
    for (let i = 0; i < SEINE_POINTS.length - 1; i++) {
      const p0 = SEINE_POINTS[i];
      const p1 = SEINE_POINTS[i + 1];
      const dx = p1.x - p0.x;
      const dz = p1.z - p0.z;
      const lenSq = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((bPos.x - p0.x) * dx + (bPos.z - p0.z) * dz) / lenSq));
      const px = p0.x + t * dx;
      const pz = p0.z + t * dz;
      const dSq = (bPos.x - px) ** 2 + (bPos.z - pz) ** 2;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        bestAngle = Math.atan2(dz, dx);
      }
    }

    const bg = new THREE.Group();
    bg.position.set(bPos.x, 0.0, bPos.z);
    // L'axe Z local du tablier traverse la Seine perpendiculairement à la tangente
    bg.rotation.y = -bestAngle;

    const deck = new THREE.Mesh(new THREE.BoxGeometry(b.width, 1.4, b.span), matBridgeStone);
    deck.position.y = 2.15;
    deck.castShadow = true;
    deck.receiveShadow = true;
    bg.add(deck);

    const road = new THREE.Mesh(new THREE.BoxGeometry(b.width - 3.6, 0.25, b.span + 1.0), b.pedestrian ? matParkPath : matAvenueAsphalt);
    road.position.y = 2.92;
    bg.add(road);

    // Courtes rampes d'approche aux extrémités du tablier rejoignant les voies sur berges à y = 0,28 m
    const rampSpan = 14;
    const rampDrop = 2.92 - 0.28;
    const rampLen = Math.hypot(rampSpan, rampDrop);
    const rampPitch = Math.atan2(rampDrop, rampSpan);
    [-1, 1].forEach((endSign) => {
      const zCenter = endSign * (b.span * 0.5 + rampSpan * 0.5);
      const rStone = new THREE.Mesh(new THREE.BoxGeometry(b.width, 1.1, rampLen), matBridgeStone);
      rStone.position.set(0, 1.15, zCenter);
      rStone.rotation.x = endSign * rampPitch;
      rStone.receiveShadow = true;
      bg.add(rStone);

      const rRoad = new THREE.Mesh(new THREE.BoxGeometry(b.width - 3.6, 0.22, rampLen + 0.4), b.pedestrian ? matParkPath : matAvenueAsphalt);
      rRoad.position.set(0, 1.62, zCenter);
      rRoad.rotation.x = endSign * rampPitch;
      bg.add(rRoad);
    });

    // Piliers ancrés profondément dans le lit de la Seine (-5,65 m -> +2,15 m)
    [-b.span * 0.28, 0, b.span * 0.28].forEach((pz) => {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(b.width + 2.2, 7.8, 5.4), matBridgeStone);
      pier.position.set(0, -1.75, pz);
      bg.add(pier);
    });

    // Pont Alexandre-III : 4 pylônes dorés emblématiques
    if (b.ornate) {
      [[-b.width * 0.45, -b.span * 0.44], [b.width * 0.45, -b.span * 0.44], [-b.width * 0.45, b.span * 0.44], [b.width * 0.45, b.span * 0.44]].forEach(
        ([px, pz]) => {
          const pylon = new THREE.Mesh(new THREE.BoxGeometry(3.2, 14, 3.2), matBridgeStone);
          pylon.position.set(px, 9.0, pz);
          bg.add(pylon);
          const pegasus = new THREE.Mesh(new THREE.ConeGeometry(1.6, 3.8, 6), matGold);
          pegasus.position.set(px, 17.7, pz);
          bg.add(pegasus);
        }
      );
    }

    staticCityLandmarks.add(bg);
  });

  /**
   * ==========================================================================
   * 3. GRANDS PARCS & AXE HISTORIQUE (TUILERIES, CHAMPS-ÉLYSÉES, LUXEMBOURG, BOULOGNE)
   * ==========================================================================
   */
  function addFlatZone(w, d, cx, cz, mat, rotY = 0, y = 0.02) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d), mat);
    m.position.set(cx, y, cz);
    m.rotation.y = rotY;
    m.receiveShadow = true;
    staticCityLandmarks.add(m);
    return m;
  }

  // Jardin des Tuileries (entre Louvre (-541, 311) et Place de la Concorde (-1960, -240))
  const tuileriesCenter = gpsToMeters(48.8635, 2.3275); // ~(-1280, -11)
  const axeAngle = Math.atan2(-240 - 240, -1960 - (-800)); // ~ -0.39 rad (~22° WNW)
  addFlatZone(880, 260, tuileriesCenter.x, tuileriesCenter.z, matParkLawn, -axeAngle, 0.01);
  addFlatZone(880, 42, tuileriesCenter.x, tuileriesCenter.z, matParkPath, -axeAngle, 0.04);

  // Place de la Concorde & Obélisque de Louxor (modélisés en détail dans champs-elysees.js)
  const concorde = gpsToMeters(48.8656, 2.3212);

  // Repères géométriques de l'Avenue des Champs-Élysées (modélisée en détail dans champs-elysees.js)
  const arcCoords = gpsToMeters(48.8738, 2.2950);
  const rondPointCE = gpsToMeters(48.8692, 2.3095);
  const champsLen = Math.hypot(arcCoords.x - concorde.x, arcCoords.z - concorde.z);
  const champsAngle = Math.atan2(arcCoords.z - concorde.z, arcCoords.x - concorde.x);

  // Jardin du Luxembourg (à l'Ouest du Panthéon — pelouse conformée à la pente de Sainte-Geneviève + Palais du Sénat & Grand Bassin)
  const luxPos = gpsToMeters(48.8462, 2.3371);
  const luxLawn = new THREE.Mesh(createTerrainRectGeometry(luxPos.x, luxPos.z + 20, 420, 440, 0, 0.16, 12), matParkLawn);
  luxLawn.receiveShadow = true;
  staticCityLandmarks.add(luxLawn);
  const luxPathA = new THREE.Mesh(
    createTerrainRibbonGeometry([{ x: luxPos.x - 195, z: luxPos.z + 20 }, { x: luxPos.x + 195, z: luxPos.z + 20 }], 6, 0.24, 22),
    matParkPath
  );
  staticCityLandmarks.add(luxPathA);
  const luxPathB = new THREE.Mesh(
    createTerrainRibbonGeometry([{ x: luxPos.x, z: luxPos.z - 185 }, { x: luxPos.x, z: luxPos.z + 225 }], 6, 0.24, 22),
    matParkPath
  );
  staticCityLandmarks.add(luxPathB);
  const luxBasin = new THREE.Mesh(
    createTerrainEllipseGeometry(luxPos.x, luxPos.z + 15, 36, 36, 0, 0.28, 3, 8),
    matCanalWater
  );
  staticCityLandmarks.add(luxBasin);
  {
    const senatY = getParisElevation(luxPos.x, luxPos.z - 135);
    const senatMain = new THREE.Mesh(new THREE.BoxGeometry(92, 20, 26), matLimestone);
    senatMain.position.set(luxPos.x, senatY + 10, luxPos.z - 135);
    staticCityLandmarks.add(senatMain);
    const senatRoof = new THREE.Mesh(new THREE.BoxGeometry(94, 5.5, 24), matSlate);
    senatRoof.position.set(luxPos.x, senatY + 22.5, luxPos.z - 135);
    staticCityLandmarks.add(senatRoof);
    [-38, 38].forEach((wx) => {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(18, 18, 52), matLimestone);
      wing.position.set(luxPos.x + wx, senatY + 9, luxPos.z - 154);
      staticCityLandmarks.add(wing);
      const wRoof = new THREE.Mesh(new THREE.BoxGeometry(19, 4.5, 53), matSlate);
      wRoof.position.set(luxPos.x + wx, senatY + 20.2, luxPos.z - 154);
      staticCityLandmarks.add(wRoof);
    });
    const senatDome = new THREE.Mesh(new THREE.SphereGeometry(8.5, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), matSlate);
    senatDome.position.set(luxPos.x, senatY + 25, luxPos.z - 135);
    staticCityLandmarks.add(senatDome);
  }

  // Bois de Boulogne (grand tapis forestier à l'extrême Ouest autour de la Fondation Louis Vuitton)
  const flvPos = gpsToMeters(48.8766, 2.2634);
  addFlatZone(1900, 2800, flvPos.x - 250, flvPos.z + 400, matParkLawn, 0, 0.01);

  // --- GRANDS BOULEVARDS, AVENUES RAYONNANTES, PLACES & ESPLANADE DES INVALIDES ---
  const boulevardSegments = [];
  const cityPlaces = [];
  const cityTreeCoords = [];

  function registerCityTree(tx, tz) {
    cityTreeCoords.push([tx, tz]);
  }

  function addCityBoulevard(pts, width, { trees = true } = {}) {
    addTerrainRibbon(pts, width, { trees });
  }

  function addTerrainRibbon(pts, width, { trees = true } = {}) {
    const roadGeo = createTerrainRibbonGeometry(pts, width * 0.5, 0.05, 24);
    const rdMesh = new THREE.Mesh(roadGeo, matRiverRoad);
    rdMesh.receiveShadow = true;
    staticCityLandmarks.add(rdMesh);

    // Disques d'intersection sans pointillés aux sommets des boulevards (raccords lisses en coude / carrefour)
    for (let i = 0; i < pts.length; i++) {
      const pt = pts[i];
      const jDisc = new THREE.Mesh(
        new THREE.CylinderGeometry(width * 0.5, width * 0.5, 0.04, 18),
        matRoadJunction
      );
      jDisc.position.set(pt.x, getParisElevation(pt.x, pt.z) + 0.04, pt.z);
      jDisc.castShadow = false;
      jDisc.receiveShadow = true;
      staticCityLandmarks.add(jDisc);
    }

    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dz) || 1;
      const angle = Math.atan2(dz, dx);
      boulevardSegments.push({
        ax: a.x,
        az: a.z,
        bx: b.x,
        bz: b.z,
        dx,
        dz,
        lenSq: dx * dx + dz * dz || 1,
        halfW: width * 0.5,
        angle,
      });

      if (trees && len > 46) {
        const nx = -dz / len;
        const nz = dx / len;
        const treeOff = width * 0.5 + 2.4;
        const steps = Math.floor(len / 36);
        for (let k = 1; k < steps; k++) {
          const t = k / steps;
          if (t * len < 22 || (1 - t) * len < 22) continue;
          const mx = a.x + dx * t;
          const mz = a.z + dz * t;
          registerCityTree(mx + nx * treeOff, mz + nz * treeOff);
          registerCityTree(mx - nx * treeOff, mz - nz * treeOff);
        }
      }
    }
  }

  const trocaderoRingWorld = { x: -4088, z: 147 };
  const concBaseAngle = Math.atan2(concorde.z - arcCoords.z, concorde.x - arcCoords.x);
  const etoileSpoke = (k, dest, dist = 250) => {
    const th = concBaseAngle + k * (Math.PI / 6);
    const start = { x: Math.round(arcCoords.x + Math.cos(th) * 82), z: Math.round(arcCoords.z + Math.sin(th) * 82) };
    const mid = { x: Math.round(arcCoords.x + Math.cos(th) * dist), z: Math.round(arcCoords.z + Math.sin(th) * dist) };
    return [start, mid, dest];
  };
  const GRAND_AXES = [
    // Rue de Rivoli & Rue Saint-Antoine (du coin NE de Concorde jusqu'à Bastille)
    {
      width: 22,
      trees: false,
      pts: [
        { x: -1594, z: -304 },
        { x: -1220, z: -145 },
        { x: -480, z: 175 },
        { x: 185, z: 490 },
        gpsToMeters(48.8555, 2.3605),
        gpsToMeters(48.8532, 2.3692),
      ],
    },
    // Boulevard de Sébastopol & Boulevard de Strasbourg
    {
      width: 28,
      trees: true,
      pts: [gpsToMeters(48.8763, 2.3585), gpsToMeters(48.8665, 2.3522), gpsToMeters(48.8584, 2.3474)],
    },
    // Boulevard Saint-Michel (Rive Gauche : Saint-Michel -> Luxembourg -> Observatoire)
    {
      width: 26,
      trees: true,
      pts: [
        gpsToMeters(48.8532, 2.3440),
        gpsToMeters(48.8498, 2.3432),
        gpsToMeters(48.8458, 2.3418),
        gpsToMeters(48.8395, 2.3368),
      ],
    },
    // Les Grands Boulevards (Madeleine -> Opéra -> Bonne-Nouvelle -> République -> Bastille)
    {
      width: 30,
      trees: true,
      pts: [
        gpsToMeters(48.8698, 2.3245),
        gpsToMeters(48.8704, 2.3324),
        gpsToMeters(48.8722, 2.3405),
        gpsToMeters(48.8698, 2.3505),
        gpsToMeters(48.8674, 2.3638),
        gpsToMeters(48.8532, 2.3692),
      ],
    },
    // Boulevard Haussmann
    {
      width: 26,
      trees: true,
      pts: [gpsToMeters(48.8752, 2.3185), gpsToMeters(48.8732, 2.3320), gpsToMeters(48.8722, 2.3405)],
    },
    // Avenue de l'Opéra (raccordée jusqu'à Rivoli) & Rue Royale
    { width: 24, trees: false, pts: [gpsToMeters(48.8704, 2.3324), { x: -480, z: 175 }] },
    { width: 24, trees: true, pts: [gpsToMeters(48.8664, 2.3218), gpsToMeters(48.8698, 2.3245)] },
    // Rue de Turbigo (prolongement continu à 35° sans cassure depuis Saint-Eustache vers République)
    {
      width: 14,
      trees: true,
      pts: [{ x: 72, z: -138 }, { x: 86, z: -148 }, { x: 220, z: -242 }, { x: 527, z: -345 }, gpsToMeters(48.8674, 2.3638)],
    },
    // Axes sortants de Saint-Eustache / Quartier des Halles raccordés aux boulevards (zéro cul-de-sac)
    { width: 13, trees: false, pts: [{ x: 140, z: -36 }, { x: 407, z: -36 }, { x: 680, z: -36 }] },               // Rambuteau -> Sébastopol & Pompidou
    { width: 13, trees: false, pts: [{ x: 140, z: 112 }, { x: 349, z: 112 }] },                                   // Berger -> Sébastopol
    { width: 13, trees: false, pts: [{ x: 72, z: -138 }, { x: 155, z: -802 }] },                                  // Saint-Denis Nord -> Grands Boulevards
    { width: 13, trees: false, pts: [{ x: 72, z: 140 }, { x: 118, z: 458 }, gpsToMeters(48.8584, 2.3474)] },       // Saint-Denis / Pierre-Lescot Sud -> Rivoli & Châtelet
    { width: 13, trees: false, pts: [{ x: -74, z: -108 }, { x: -165, z: -460 }, { x: -255, z: -952 }] },          // Montmartre Nord -> Grands Boulevards
    { width: 13, trees: false, pts: [{ x: -74, z: 140 }, { x: -130, z: 341 }, gpsToMeters(48.8571, 2.3414)] },    // Rue du Jour -> Rivoli & Pont Neuf
    { width: 15, trees: true, pts: [{ x: -329, z: -979 }, { x: -140, z: -108 }, { x: -140, z: 112 }, { x: -204, z: 306 }, { x: -263, z: 640 }] }, // Rue du Louvre -> Bourse -> Pont Neuf
    { width: 13, trees: false, pts: [{ x: -140, z: -36 }, { x: -480, z: 175 }] },                                 // Coquillière -> Palais-Royal / Rivoli
    // Boulevard Magenta & Boulevard Voltaire
    {
      width: 26,
      trees: true,
      pts: [gpsToMeters(48.8802, 2.3555), gpsToMeters(48.8674, 2.3638), gpsToMeters(48.8560, 2.3820)],
    },
    // Les 11 avenues rayonnantes de l'Étoile (démarrant au bord r = 82 m hors du rond-point pavé ; Champs-Élysées modélisés dans champs-elysees.js)
    { width: 22, trees: true, pts: etoileSpoke(1, gpsToMeters(48.8648, 2.3075)) },  // Marceau
    { width: 24, trees: true, pts: etoileSpoke(2, gpsToMeters(48.8644, 2.3012)) },  // Iéna
    { width: 26, trees: true, pts: etoileSpoke(3, trocaderoRingWorld) },              // Kléber -> Trocadéro
    { width: 24, trees: true, pts: etoileSpoke(4, gpsToMeters(48.8682, 2.2805)) },  // Victor-Hugo
    { width: 32, trees: true, pts: etoileSpoke(5, gpsToMeters(48.8716, 2.2755)) },  // Foch
    { width: 36, trees: true, pts: etoileSpoke(6, gpsToMeters(48.8782, 2.2800)) },  // Grande-Armée
    { width: 22, trees: true, pts: etoileSpoke(7, gpsToMeters(48.8805, 2.2882)) },  // Carnot
    { width: 22, trees: true, pts: etoileSpoke(8, gpsToMeters(48.8825, 2.2962)) },  // Mac-Mahon
    { width: 26, trees: true, pts: etoileSpoke(9, gpsToMeters(48.8835, 2.3035)) },  // Wagram
    { width: 24, trees: true, pts: etoileSpoke(10, gpsToMeters(48.8794, 2.3088)) }, // Hoche
    { width: 26, trees: true, pts: etoileSpoke(11, gpsToMeters(48.8752, 2.3185)) }, // Friedland
    // Boulevard Saint-Germain (Rive Gauche)
    {
      width: 26,
      trees: true,
      pts: [
        gpsToMeters(48.8615, 2.3188),
        gpsToMeters(48.8588, 2.3248),
        gpsToMeters(48.8540, 2.3335),
        gpsToMeters(48.8515, 2.3425),
        gpsToMeters(48.8495, 2.3545),
      ],
    },
    // Boulevard Raspail & Rue Soufflot
    {
      width: 26,
      trees: true,
      pts: [gpsToMeters(48.8542, 2.3268), gpsToMeters(48.8425, 2.3295), gpsToMeters(48.8345, 2.3325)],
    },
    // Rue Soufflot : perspective rectiligne du Jardin du Luxembourg (Place Edmond-Rostand) jusqu'à la Place du Panthéon
    { width: 24, trees: true, pts: [gpsToMeters(48.8472, 2.3401), { x: -18, z: 1881 }] },
    // Avenue de Breteuil (au Sud du Dôme des Invalides)
    { width: 42, trees: true, pts: [gpsToMeters(48.8522, 2.3122), gpsToMeters(48.8435, 2.3115)] },
    // --- GRANDES PERCÉES HAUSSMANNIENNES, CEINTURES & DIAGONALES PARISIENNES (GPS 1:1) ---
    // Ceinture Extérieure Nord : Courcelles -> Batignolles -> Clichy -> Pigalle -> Anvers -> Barbès -> Chapelle -> Stalingrad
    {
      width: 28,
      trees: true,
      pts: [
        gpsToMeters(48.8794, 2.3088),
        gpsToMeters(48.8825, 2.3202),
        gpsToMeters(48.8837, 2.3274),
        gpsToMeters(48.8822, 2.3374),
        gpsToMeters(48.8830, 2.3435),
        gpsToMeters(48.8838, 2.3496),
        gpsToMeters(48.8842, 2.3595),
        gpsToMeters(48.8842, 2.3702),
      ],
    },
    // Avenue de Clichy & Avenue de Saint-Ouen (fourche Nord-Ouest depuis Place de Clichy)
    { width: 22, trees: true, pts: [gpsToMeters(48.8837, 2.3274), gpsToMeters(48.8942, 2.3155)] },
    { width: 22, trees: true, pts: [gpsToMeters(48.8837, 2.3274), gpsToMeters(48.8965, 2.3288)] },
    // Boulevard Barbès & Boulevard Ornano (axe Nord-Sud à l'Est de la Butte Montmartre)
    { width: 24, trees: true, pts: [gpsToMeters(48.8838, 2.3496), gpsToMeters(48.8920, 2.3474), gpsToMeters(48.8992, 2.3448)] },
    // Boulevard Malesherbes (Madeleine -> Saint-Augustin -> Parc Monceau -> Porte d'Asnières)
    {
      width: 26,
      trees: true,
      pts: [
        gpsToMeters(48.8698, 2.3245),
        gpsToMeters(48.8754, 2.3198),
        gpsToMeters(48.8825, 2.3105),
        gpsToMeters(48.8915, 2.3015),
      ],
    },
    // Rue Lafayette (grande diagonale Rive Droite : Chaussée d'Antin -> Gare du Nord -> Stalingrad -> La Villette)
    {
      width: 22,
      trees: false,
      pts: [
        gpsToMeters(48.8738, 2.3365),
        gpsToMeters(48.8768, 2.3472),
        gpsToMeters(48.8798, 2.3568),
        gpsToMeters(48.8842, 2.3702),
        gpsToMeters(48.8895, 2.3855),
      ],
    },
    // Ceinture Est : Boulevard de la Villette -> Belleville -> Ménilmontant -> Père-Lachaise
    {
      width: 26,
      trees: true,
      pts: [
        gpsToMeters(48.8842, 2.3702),
        gpsToMeters(48.8722, 2.3768),
        gpsToMeters(48.8648, 2.3835),
        gpsToMeters(48.8575, 2.3885),
      ],
    },
    // Avenue de la République (République -> Père-Lachaise) & Faubourg Saint-Antoine (Bastille -> Nation)
    { width: 26, trees: true, pts: [gpsToMeters(48.8674, 2.3638), gpsToMeters(48.8648, 2.3835)] },
    { width: 22, trees: false, pts: [gpsToMeters(48.8532, 2.3692), gpsToMeters(48.8510, 2.3818), gpsToMeters(48.8484, 2.3958)] },
    // Boulevard Voltaire prolongé -> Nation & Boulevard Diderot -> Gare de Lyon -> Nation
    { width: 26, trees: true, pts: [gpsToMeters(48.8560, 2.3820), gpsToMeters(48.8484, 2.3958)] },
    { width: 24, trees: true, pts: [gpsToMeters(48.8448, 2.3735), gpsToMeters(48.8468, 2.3845), gpsToMeters(48.8484, 2.3958)] },
    // Boulevard du Montparnasse -> Place du 18-Juin-1940 -> Port-Royal -> Saint-Marcel (grande transversale Rive Gauche)
    {
      width: 28,
      trees: true,
      pts: [
        gpsToMeters(48.8470, 2.3168),
        gpsToMeters(48.8432, 2.3228),
        gpsToMeters(48.8404, 2.3338),
        gpsToMeters(48.8384, 2.3498),
        gpsToMeters(48.8422, 2.3632),
      ],
    },
    // Rue de Rennes -> Place du 18-Juin-1940 -> Avenue du Maine (contourne proprement l'esplanade Tour Montparnasse)
    {
      width: 22,
      trees: false,
      pts: [
        gpsToMeters(48.8540, 2.3335),
        gpsToMeters(48.8432, 2.3228),
        gpsToMeters(48.8423, 2.3202),
        gpsToMeters(48.8315, 2.3178),
      ],
    },
    // Avenue des Gobelins -> Place d'Italie & Avenue Denfert-Rochereau / Général-Leclerc
    { width: 26, trees: true, pts: [gpsToMeters(48.8384, 2.3498), gpsToMeters(48.8316, 2.3556)] },
    { width: 26, trees: true, pts: [gpsToMeters(48.8404, 2.3338), gpsToMeters(48.8343, 2.3324), gpsToMeters(48.8235, 2.3268)] },
    // Boulevard de Grenelle -> Garibaldi -> Pasteur -> Place du 18-Juin-1940 (axe ligne 6 Rive Gauche)
    {
      width: 26,
      trees: true,
      pts: [
        gpsToMeters(48.8556, 2.2872),
        gpsToMeters(48.8492, 2.2982),
        gpsToMeters(48.8458, 2.3075),
        gpsToMeters(48.8432, 2.3228),
      ],
    },
    // Rue de Vaugirard (longue diagonale du 15e) & Avenue Mozart / Passy (16e)
    { width: 20, trees: false, pts: [gpsToMeters(48.8485, 2.3345), gpsToMeters(48.8435, 2.3125), gpsToMeters(48.8365, 2.2925)] },
    { width: 22, trees: true, pts: [gpsToMeters(48.8588, 2.2812), gpsToMeters(48.8520, 2.2712), gpsToMeters(48.8435, 2.2620)] },
  ];
  GRAND_AXES.forEach((ax) => addCityBoulevard(ax.pts, ax.width, { trees: ax.trees }));

  // Segment directeur Champs-Élysées pour orienter les îlots haussmanniens voisins sur l'Axe Historique
  {
    const dx = arcCoords.x - concorde.x;
    const dz = arcCoords.z - concorde.z;
    boulevardSegments.push({
      ax: concorde.x,
      az: concorde.z,
      bx: arcCoords.x,
      bz: arcCoords.z,
      dx,
      dz,
      lenSq: dx * dx + dz * dz || 1,
      halfW: 54,
      angle: Math.atan2(dz, dx),
    });
  }

  // Grandes Places parisiennes
  function addCircularPlaza({ lat, lon, r, ornament = 'statue' }) {
    const pos = gpsToMeters(lat, lon);
    const py = getParisElevation(pos.x, pos.z);
    cityPlaces.push({ x: pos.x, z: pos.z, r });

    const ring = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 2, 0.24, 32), matAvenueAsphalt);
    ring.position.set(pos.x, py + 0.14, pos.z);
    ring.receiveShadow = true;
    staticCityLandmarks.add(ring);

    const island = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.62, r * 0.64, 0.28, 28), matParkPath);
    island.position.set(pos.x, py + 0.22, pos.z);
    island.receiveShadow = true;
    staticCityLandmarks.add(island);

    if (ornament === 'column-gold' || ornament === 'column-bronze') {
      const ped = new THREE.Mesh(new THREE.BoxGeometry(10, 8, 10), matLimestone);
      ped.position.set(pos.x, py + 4, pos.z);
      staticCityLandmarks.add(ped);
      const col = new THREE.Mesh(
        new THREE.CylinderGeometry(1.7, 2.1, 34, 16),
        ornament === 'column-gold' ? matGold : matSlate
      );
      col.position.set(pos.x, py + 25, pos.z);
      staticCityLandmarks.add(col);
      const topStat = new THREE.Mesh(new THREE.OctahedronGeometry(2.6, 1), matGold);
      topStat.position.set(pos.x, py + 44, pos.z);
      staticCityLandmarks.add(topStat);
    } else if (ornament === 'temple') {
      const temple = new THREE.Mesh(new THREE.BoxGeometry(44, 24, 72), matLimestone);
      temple.position.set(pos.x, py + 12, pos.z);
      staticCityLandmarks.add(temple);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(34, 10, 4), matSlate);
      roof.position.set(pos.x, py + 29, pos.z);
      roof.rotation.y = Math.PI * 0.25;
      staticCityLandmarks.add(roof);
    } else if (ornament === 'statue') {
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 5.5, 9, 12), matLimestone);
      ped.position.set(pos.x, py + 4.5, pos.z);
      staticCityLandmarks.add(ped);
      const fig = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.2, 8, 10), matGold);
      fig.position.set(pos.x, py + 13, pos.z);
      staticCityLandmarks.add(fig);
    } else if (ornament === 'fountain') {
      const lawn = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.56, r * 0.58, 0.32, 24), matParkLawn);
      lawn.position.set(pos.x, py + 0.28, pos.z);
      staticCityLandmarks.add(lawn);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(10.5, 11.2, 1.3, 20), matLimestone);
      rim.position.set(pos.x, py + 0.85, pos.z);
      staticCityLandmarks.add(rim);
      const pool = new THREE.Mesh(new THREE.CylinderGeometry(9.4, 9.4, 0.9, 20), matGlassLOD);
      pool.position.set(pos.x, py + 1.05, pos.z);
      staticCityLandmarks.add(pool);
      const jet = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.4, 5.5, 10), matLimestone);
      jet.position.set(pos.x, py + 3.4, pos.z);
      staticCityLandmarks.add(jet);
    } else if (ornament === 'rotunda') {
      // Rotonde de la Villette (Claude-Nicolas Ledoux, Place de Stalingrad)
      const base = new THREE.Mesh(new THREE.BoxGeometry(28, 12, 28), matLimestone);
      base.position.set(pos.x, py + 6, pos.z);
      staticCityLandmarks.add(base);
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(11.5, 12.2, 13, 20), matLimestone);
      drum.position.set(pos.x, py + 18, pos.z);
      staticCityLandmarks.add(drum);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(12.2, 5, 20), matSlate);
      cap.position.set(pos.x, py + 27, pos.z);
      staticCityLandmarks.add(cap);
    } else if (ornament === 'dome') {
      // Église à coupole type Saint-Augustin
      const body = new THREE.Mesh(new THREE.BoxGeometry(26, 20, 34), matLimestone);
      body.position.set(pos.x, py + 10, pos.z);
      staticCityLandmarks.add(body);
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(10, 11, 14, 18), matLimestone);
      drum.position.set(pos.x, py + 27, pos.z);
      staticCityLandmarks.add(drum);
      const cup = new THREE.Mesh(new THREE.SphereGeometry(10.2, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), matPatinaCopper);
      cup.position.set(pos.x, py + 34, pos.z);
      staticCityLandmarks.add(cup);
    } else if (ornament === 'lion') {
      // Lion de Belfort (Bartholdi) sur la Place Denfert-Rochereau
      const ped = new THREE.Mesh(new THREE.BoxGeometry(10, 6.5, 6.5), matLimestone);
      ped.position.set(pos.x, py + 3.25, pos.z);
      staticCityLandmarks.add(ped);
      const lion = new THREE.Mesh(new THREE.BoxGeometry(7.2, 4.2, 3.4), matPatinaCopper);
      lion.position.set(pos.x, py + 8.5, pos.z);
      staticCityLandmarks.add(lion);
    }

    // Couronne d'arbres autour des grandes places rondes (>= 56 m)
    if (r >= 56 && ornament !== 'temple') {
      const nTrees = Math.min(14, Math.floor(r / 5.5));
      for (let t = 0; t < nTrees; t++) {
        const a = (t / nTrees) * Math.PI * 2;
        registerCityTree(pos.x + Math.cos(a) * (r * 0.52), pos.z + Math.sin(a) * (r * 0.52));
      }
    }
  }

  addCircularPlaza({ lat: 48.8674, lon: 2.3638, r: 68, ornament: 'statue' });        // Place de la République
  addCircularPlaza({ lat: 48.8532, lon: 2.3692, r: 66, ornament: 'column-gold' });   // Place de la Bastille
  addCircularPlaza({ lat: 48.8675, lon: 2.3294, r: 56, ornament: 'column-bronze' }); // Place Vendôme
  addCircularPlaza({ lat: 48.8698, lon: 2.3245, r: 64, ornament: 'temple' });        // Place de la Madeleine
  addCircularPlaza({ lat: 48.8584, lon: 2.3474, r: 52, ornament: 'column-gold' });   // Place du Châtelet
  addCircularPlaza({ lat: 48.8837, lon: 2.3274, r: 54, ornament: 'statue' });        // Place de Clichy
  addCircularPlaza({ lat: 48.8822, lon: 2.3374, r: 44, ornament: 'fountain' });      // Place Pigalle
  addCircularPlaza({ lat: 48.8484, lon: 2.3958, r: 84, ornament: 'statue' });        // Place de la Nation
  addCircularPlaza({ lat: 48.8316, lon: 2.3556, r: 70, ornament: 'fountain' });      // Place d'Italie
  addCircularPlaza({ lat: 48.8343, lon: 2.3324, r: 62, ornament: 'lion' });          // Place Denfert-Rochereau
  addCircularPlaza({ lat: 48.8842, lon: 2.3702, r: 58, ornament: 'rotunda' });       // Stalingrad / Rotonde de la Villette
  addCircularPlaza({ lat: 48.8754, lon: 2.3198, r: 48, ornament: 'dome' });          // Place Saint-Augustin
  addCircularPlaza({ lat: 48.8509, lon: 2.3335, r: 52, ornament: 'fountain' });      // Place Saint-Sulpice
  addCircularPlaza({ lat: 48.8696, lon: 2.2852, r: 44, ornament: 'fountain' });      // Place Victor-Hugo
  addCircularPlaza({ lat: 48.8691, lon: 2.3411, r: 54, ornament: 'temple' });        // Place de la Bourse (Palais Brongniart)
  addCircularPlaza({ lat: 48.8782, lon: 2.2828, r: 56, ornament: 'fountain' });      // Place de la Porte-Maillot

  // --- CANAL SAINT-MARTIN & BASSIN DE LA VILLETTE (Ruban d'eau bordé de platanes, 10e/11e/19e) ---
  const canalPts = [
    gpsToMeters(48.8532, 2.3692), // Port de l'Arsenal / Bastille
    gpsToMeters(48.8690, 2.3672), // Quai de Valmy / République
    gpsToMeters(48.8768, 2.3652), // Écluses Saint-Martin
    gpsToMeters(48.8842, 2.3702), // Stalingrad / Rotonde
    gpsToMeters(48.8918, 2.3822), // Bassin de la Villette
  ];
  const canalRibbonGeo = createTerrainRibbonGeometry(canalPts, 16, 0.08, 28);
  const canalMesh = new THREE.Mesh(canalRibbonGeo, matCanalWater);
  canalMesh.receiveShadow = true;
  staticCityLandmarks.add(canalMesh);
  const canalQuayGeo = createTerrainRibbonGeometry(canalPts, 24, 0.04, 28);
  const canalQuayMesh = new THREE.Mesh(canalQuayGeo, matParkPath);
  canalQuayMesh.receiveShadow = true;
  staticCityLandmarks.add(canalQuayMesh);
  for (let i = 0; i < canalPts.length - 1; i++) {
    const a = canalPts[i];
    const b = canalPts[i + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const nx = -(b.z - a.z) / len;
    const nz = (b.x - a.x) / len;
    const steps = Math.floor(len / 34);
    for (let k = 1; k < steps; k++) {
      const t = k / steps;
      const mx = THREE.MathUtils.lerp(a.x, b.x, t);
      const mz = THREE.MathUtils.lerp(a.z, b.z, t);
      registerCityTree(mx + nx * 21, mz + nz * 21);
      registerCityTree(mx - nx * 21, mz - nz * 21);
    }
  }

  // --- GRANDS PARCS, CIMETIÈRES BOISÉS, GARES PARISIENNES & TOUR MONTPARNASSE (GPS 1:1) ---
  const cityParks = [];
  function addParisPark({ lat, lon, rx, rz, trees = 32, hasLake = false, hasSibylle = false, hasGreenhouse = false, rotY = 0 }) {
    const pos = gpsToMeters(lat, lon);
    const py = getParisElevation(pos.x, pos.z);
    cityParks.push({ x: pos.x, z: pos.z, rx, rz });

    // Pelouse elliptique subdivisée épousant exactement le relief (aucune découpe sur Montmartre / Sainte-Geneviève)
    const lawn = new THREE.Mesh(
      createTerrainEllipseGeometry(pos.x, pos.z, rx, rz, rotY, 0.16, 8, 28),
      matParkLawn
    );
    lawn.receiveShadow = true;
    staticCityLandmarks.add(lawn);

    // Allées sablées en croix conformées au relief à travers le parc
    const cosR = Math.cos(rotY);
    const sinR = Math.sin(rotY);
    const pA0 = { x: pos.x - rx * 0.90 * cosR, z: pos.z + rx * 0.90 * sinR };
    const pA1 = { x: pos.x + rx * 0.90 * cosR, z: pos.z - rx * 0.90 * sinR };
    const pB0 = { x: pos.x - rz * 0.90 * sinR, z: pos.z - rz * 0.90 * cosR };
    const pB1 = { x: pos.x + rz * 0.90 * sinR, z: pos.z + rz * 0.90 * cosR };
    const pathA = new THREE.Mesh(createTerrainRibbonGeometry([pA0, pA1], 4.2, 0.24, 18), matParkPath);
    pathA.receiveShadow = true;
    staticCityLandmarks.add(pathA);
    const pathB = new THREE.Mesh(createTerrainRibbonGeometry([pB0, pB1], 4.2, 0.24, 18), matParkPath);
    pathB.receiveShadow = true;
    staticCityLandmarks.add(pathB);

    if (hasLake) {
      const lake = new THREE.Mesh(
        createTerrainEllipseGeometry(pos.x, pos.z, rx * 0.36, rz * 0.36, rotY, 0.28, 4, 22),
        matCanalWater
      );
      staticCityLandmarks.add(lake);
      if (hasSibylle) {
        // Rocher central & Temple de la Sibylle (Buttes-Chaumont)
        const rock = new THREE.Mesh(new THREE.ConeGeometry(28, 28, 10), matBridgeStone);
        rock.position.set(pos.x, py + 14, pos.z);
        staticCityLandmarks.add(rock);
        const temple = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 6.0, 9.5, 12), matLimestone);
        temple.position.set(pos.x, py + 31, pos.z);
        staticCityLandmarks.add(temple);
        const dome = new THREE.Mesh(new THREE.SphereGeometry(5.8, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), matLimestone);
        dome.position.set(pos.x, py + 35.8, pos.z);
        staticCityLandmarks.add(dome);
      }
    }

    if (hasGreenhouse) {
      const gx = pos.x + rx * 0.22;
      const gz = pos.z - rz * 0.2;
      const gy = getParisElevation(gx, gz);
      const serre = new THREE.Mesh(new THREE.BoxGeometry(46, 15, 22), matGlassLOD);
      serre.position.set(gx, gy + 7.5, gz);
      staticCityLandmarks.add(serre);
    }

    for (let t = 0; t < trees; t++) {
      const a = (t / trees) * Math.PI * 2 + (t % 3) * 0.27;
      const frac = 0.48 + ((t * 17) % 10) * 0.044;
      registerCityTree(pos.x + Math.cos(a) * rx * frac, pos.z + Math.sin(a) * rz * frac);
    }
  }

  addParisPark({ lat: 48.8809, lon: 2.3828, rx: 220, rz: 185, trees: 46, hasLake: true, hasSibylle: true }); // Parc des Buttes-Chaumont
  addParisPark({ lat: 48.8614, lon: 2.3934, rx: 245, rz: 215, trees: 54 });                                   // Cimetière du Père-Lachaise
  addParisPark({ lat: 48.8878, lon: 2.3302, rx: 145, rz: 170, trees: 36 });                                   // Cimetière de Montmartre (Ouest du Sacré-Cœur !)
  addParisPark({ lat: 48.8439, lon: 2.3598, rx: 185, rz: 125, trees: 34, hasGreenhouse: true });              // Jardin des Plantes
  addParisPark({ lat: 48.8648, lon: 2.3375, rx: 64,  rz: 108, trees: 20 });                                   // Jardin du Palais-Royal
  addParisPark({ lat: 48.8902, lon: 2.3168, rx: 140, rz: 120, trees: 28, hasLake: true });                    // Parc Martin-Luther-King (Batignolles)
  addParisPark({ lat: 48.8222, lon: 2.3382, rx: 185, rz: 150, trees: 38, hasLake: true });                    // Parc Montsouris
  addParisPark({ lat: 48.8415, lon: 2.2750, rx: 165, rz: 128, trees: 28, hasGreenhouse: true });              // Parc André-Citroën

  // 4 Grandes Gares Parisiennes (halles verrières courbes & façades Beaux-Arts + Tour de l'Horloge Gare de Lyon)
  function addParisTrainStation({ lat, lon, w, d, rotY = 0, hasClockTower = false }) {
    const pos = gpsToMeters(lat, lon);
    const py = getParisElevation(pos.x, pos.z);
    cityParks.push({ x: pos.x, z: pos.z, rx: Math.max(w, d) * 0.62, rz: Math.max(w, d) * 0.62 });
    const g = new THREE.Group();
    g.position.set(pos.x, py, pos.z);
    g.rotation.y = rotY;
    const parvis = new THREE.Mesh(new THREE.BoxGeometry(w + 26, 0.3, d + 26), matParkPath);
    parvis.position.y = 0.08;
    g.add(parvis);
    // Bâtiment voyageurs en pierre de taille
    const head = new THREE.Mesh(new THREE.BoxGeometry(w, 22, 24), matLimestone);
    head.position.set(0, 11, d * 0.5 - 12);
    g.add(head);
    const headRoof = new THREE.Mesh(new THREE.BoxGeometry(w + 2, 5, 22), matSlate);
    headRoof.position.set(0, 24.5, d * 0.5 - 12);
    g.add(headRoof);
    // Double grande halle verrière métallique courbe
    [-w * 0.24, w * 0.24].forEach((hx) => {
      const hall = new THREE.Mesh(
        new THREE.CylinderGeometry(w * 0.22, w * 0.22, d - 24, 14, 1, false, 0, Math.PI),
        matGlassLOD
      );
      hall.rotation.set(Math.PI * 0.5, 0, -Math.PI * 0.5);
      hall.position.set(hx, 12, -12);
      g.add(hall);
    });
    if (hasClockTower) {
      // Beffroi / Tour de l'Horloge de la Gare de Lyon (67 m)
      const tower = new THREE.Mesh(new THREE.BoxGeometry(11, 56, 11), matLimestone);
      tower.position.set(-w * 0.42, 28, d * 0.5 - 8);
      g.add(tower);
      const spire = new THREE.Mesh(new THREE.ConeGeometry(7.2, 12, 4), matSlate);
      spire.position.set(-w * 0.42, 62, d * 0.5 - 8);
      spire.rotation.y = Math.PI * 0.25;
      g.add(spire);
      const dial = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.6, 14), matGold);
      dial.rotation.x = Math.PI * 0.5;
      dial.position.set(-w * 0.42, 46, d * 0.5 - 2.3);
      g.add(dial);
    }
    staticCityLandmarks.add(g);
  }

  addParisTrainStation({ lat: 48.8809, lon: 2.3553, w: 118, d: 155, rotY: 0.14 });                      // Gare du Nord
  addParisTrainStation({ lat: 48.8768, lon: 2.3592, w: 108, d: 145, rotY: 0.08 });                      // Gare de l'Est
  addParisTrainStation({ lat: 48.8760, lon: 2.3252, w: 122, d: 135, rotY: -0.22 });                     // Gare Saint-Lazare
  addParisTrainStation({ lat: 48.8448, lon: 2.3735, w: 112, d: 152, rotY: -0.68, hasClockTower: true }); // Gare de Lyon (Beffroi 67 m)

  // Tour Montparnasse (210 m — mur-rideau verre bronze & aluminium brossé, socle Maine-Montparnasse & terrasse panoramique)
  const matMontparnasse = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: createMontparnasseTexture(),
    emissive: new THREE.Color(0xffc978),
    emissiveMap: createMontparnasseEmissiveTexture(),
    emissiveIntensity: 0.08,
    roughness: 0.34,
    metalness: 0.32,
  });
  {
    const mpPos = gpsToMeters(48.8421, 2.3219);
    const mpY = getParisElevation(mpPos.x, mpPos.z);
    cityParks.push({ x: mpPos.x, z: mpPos.z, rx: 86, rz: 86 });
    const mpGroup = new THREE.Group();
    mpGroup.position.set(mpPos.x, mpY, mpPos.z);
    mpGroup.rotation.y = 0.46;

    // Parvis minéral & socle commercial Maine-Montparnasse
    const mpBase = new THREE.Mesh(new THREE.BoxGeometry(108, 0.35, 96), matParkPath);
    mpBase.position.y = 0.12;
    mpBase.receiveShadow = true;
    mpGroup.add(mpBase);
    const mpPodium = new THREE.Mesh(new THREE.BoxGeometry(82, 14, 52), matLimestone);
    mpPodium.position.set(0, 7, 16);
    mpGroup.add(mpPodium);
    const mpPodiumGlass = new THREE.Mesh(new THREE.BoxGeometry(83, 6.5, 48), matGlassLOD);
    mpPodiumGlass.position.set(0, 7.5, 16);
    mpGroup.add(mpPodiumGlass);

    // Silhouette en amande / facettée de 59 étages (210 m) à double corps croisé pour des UV parfaitement nets
    const mpCoreMain = new THREE.Mesh(new THREE.BoxGeometry(42, 210, 36), matMontparnasse);
    mpCoreMain.position.set(0, 105, -2);
    mpCoreMain.castShadow = true;
    mpGroup.add(mpCoreMain);
    const mpCoreWings = new THREE.Mesh(new THREE.BoxGeometry(58, 210, 22), matMontparnasse);
    mpCoreWings.position.set(0, 105, -2);
    mpCoreWings.castShadow = true;
    mpGroup.add(mpCoreWings);

    // Couronnement terrasse panoramique 59e étage + garde-corps métallique + mât technique
    const mpCrown = new THREE.Mesh(new THREE.BoxGeometry(59.5, 3.6, 23.5), matSlate);
    mpCrown.position.set(0, 211.5, -2);
    mpGroup.add(mpCrown);
    const mpCrownCenter = new THREE.Mesh(new THREE.BoxGeometry(43.5, 3.6, 37.5), matSlate);
    mpCrownCenter.position.set(0, 211.5, -2);
    mpGroup.add(mpCrownCenter);
    const mpPenthouse = new THREE.Mesh(new THREE.BoxGeometry(24, 5.5, 16), matBridgeStone);
    mpPenthouse.position.set(0, 215.5, -2);
    mpGroup.add(mpPenthouse);
    const mpMast = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.55, 14, 8), matBridgeStone);
    mpMast.position.set(0, 224.5, -2);
    mpGroup.add(mpMast);

    staticCityLandmarks.add(mpGroup);
  }

  // Église Saint-Sulpice (façade classique à deux tours asymétriques bordant la Place Saint-Sulpice)
  {
    const ssPos = gpsToMeters(48.8509, 2.3348);
    const ssY = getParisElevation(ssPos.x, ssPos.z);
    cityParks.push({ x: ssPos.x, z: ssPos.z, rx: 64, rz: 48 });
    const ssBody = new THREE.Mesh(new THREE.BoxGeometry(88, 26, 46), matLimestone);
    ssBody.position.set(ssPos.x + 28, ssY + 13, ssPos.z);
    staticCityLandmarks.add(ssBody);
    [-16, 16].forEach((tz, ti) => {
      const hT = ti === 0 ? 73 : 68;
      const tMesh = new THREE.Mesh(new THREE.BoxGeometry(12, hT, 12), matLimestone);
      tMesh.position.set(ssPos.x - 14, ssY + hT * 0.5, ssPos.z + tz);
      staticCityLandmarks.add(tMesh);
    });
  }

  // Parc Monceau (grand parc vert arboré conformé au relief)
  const monceauPos = gpsToMeters(48.8794, 2.3088);
  cityPlaces.push({ x: monceauPos.x, z: monceauPos.z, r: 115 });
  const monceauLawn = new THREE.Mesh(
    createTerrainEllipseGeometry(monceauPos.x, monceauPos.z, 113, 113, 0, 0.12, 6, 30),
    matParkLawn
  );
  monceauLawn.receiveShadow = true;
  staticCityLandmarks.add(monceauLawn);
  for (let a = 0; a < 18; a++) {
    const ang = (a / 18) * Math.PI * 2;
    const rad = 45 + (a % 3) * 24;
    registerCityTree(monceauPos.x + Math.cos(ang) * rad, monceauPos.z + Math.sin(ang) * rad);
  }

  // Place des Vosges (square carré arboré encadré de 4 ailes briques/pierre à toits d'ardoise)
  const vosgesPos = gpsToMeters(48.8556, 2.3655);
  cityPlaces.push({ x: vosgesPos.x, z: vosgesPos.z, r: 86 });
  addFlatZone(136, 136, vosgesPos.x, vosgesPos.z, matParkPath, 0, 0.03);
  addFlatZone(96, 96, vosgesPos.x, vosgesPos.z, matParkLawn, 0, 0.07);
  [[-58, 0, 14, 128], [58, 0, 14, 128], [0, -58, 128, 14], [0, 58, 128, 14]].forEach(([ox, oz, w, d]) => {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(w, 16, d), matLimestone);
    wing.position.set(vosgesPos.x + ox, 8, vosgesPos.z + oz);
    staticCityLandmarks.add(wing);
    const wRoof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 4.5, d * 0.9), matSlate);
    wRoof.position.set(vosgesPos.x + ox, 18.2, vosgesPos.z + oz);
    staticCityLandmarks.add(wRoof);
  });
  for (let vx = -36; vx <= 36; vx += 24) {
    for (let vz = -36; vz <= 36; vz += 24) {
      if (Math.abs(vx) < 12 && Math.abs(vz) < 12) continue;
      registerCityTree(vosgesPos.x + vx, vosgesPos.z + vz);
    }
  }

  // Arbres des grands parcs parisiens (Tuileries, Champs-Élysées, Luxembourg, Invalides)
  for (let t = -390; t <= 390; t += 44) {
    const cT = Math.cos(axeAngle);
    const sT = Math.sin(axeAngle);
    [-68, -42, 42, 68].forEach((lat) => {
      registerCityTree(tuileriesCenter.x + t * cT - lat * sT, tuileriesCenter.z + t * sT + lat * cT);
    });
  }
  for (let lx = -165; lx <= 165; lx += 44) {
    for (let lz = -175; lz <= 175; lz += 44) {
      if (Math.abs(lx) < 42 && Math.abs(lz) < 42) continue;
      registerCityTree(luxPos.x + lx, luxPos.z + 20 + lz);
    }
  }

  // Esplanade des Invalides & Hôtel National des Invalides (Dôme doré 107 m dans l'axe du Pont Alexandre-III)
  const invEsplanadeN = gpsToMeters(48.8622, 2.3134);
  const invEsplanadeS = gpsToMeters(48.8572, 2.3128);
  const invPos = gpsToMeters(48.8550, 2.3125);
  const invMidX = (invEsplanadeN.x + invEsplanadeS.x) * 0.5;
  const invMidZ = (invEsplanadeN.z + invEsplanadeS.z) * 0.5;
  const invLen = Math.hypot(invEsplanadeS.x - invEsplanadeN.x, invEsplanadeS.z - invEsplanadeN.z);
  const invRot = Math.atan2(invEsplanadeS.x - invEsplanadeN.x, invEsplanadeS.z - invEsplanadeN.z);
  addFlatZone(220, invLen, invMidX, invMidZ, matParkLawn, invRot, 0.02);
  addFlatZone(32, invLen + 40, invMidX, invMidZ, matAvenueAsphalt, invRot, 0.06);
  for (let s = -invLen * 0.46; s <= invLen * 0.46; s += 40) {
    [-26, 26, -86, 86].forEach((lat) => {
      registerCityTree(
        invMidX + lat * Math.cos(invRot) + s * Math.sin(invRot),
        invMidZ - lat * Math.sin(invRot) + s * Math.cos(invRot)
      );
    });
  }

  const invGroup = new THREE.Group();
  invGroup.position.set(invPos.x, 0, invPos.z);
  invGroup.rotation.y = invRot;
  const invCour = new THREE.Mesh(new THREE.BoxGeometry(220, 0.25, 210), matParkPath);
  invCour.position.y = 0.08;
  invCour.receiveShadow = true;
  invGroup.add(invCour);
  const invFacade = new THREE.Mesh(new THREE.BoxGeometry(196, 22, 24), matLimestone);
  invFacade.position.set(0, 11, -78);
  invFacade.castShadow = true;
  invFacade.receiveShadow = true;
  invGroup.add(invFacade);
  [[-66, -18], [66, -18], [0, 32]].forEach(([ox, oz]) => {
    const w = oz > 0 ? 148 : 22;
    const d = oz > 0 ? 28 : 112;
    const block = new THREE.Mesh(new THREE.BoxGeometry(w, 22, d), matLimestone);
    block.position.set(ox, 11, oz);
    invGroup.add(block);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w - 2, 5, d - 2), matSlate);
    roof.position.set(ox, 24.5, oz);
    invGroup.add(roof);
  });
  // Église du Dôme des Invalides & coupole dorée (107 m)
  const domeBase = new THREE.Mesh(new THREE.BoxGeometry(52, 28, 52), matParisWhite);
  domeBase.position.set(0, 14, 62);
  invGroup.add(domeBase);
  const domeDrum = new THREE.Mesh(new THREE.CylinderGeometry(18, 19.5, 28, 24), matParisWhite);
  domeDrum.position.set(0, 42, 62);
  invGroup.add(domeDrum);
  const domeCupola = new THREE.Mesh(
    new THREE.SphereGeometry(18.2, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.58),
    matGold
  );
  domeCupola.scale.set(1, 1.38, 1);
  domeCupola.position.set(0, 56, 62);
  invGroup.add(domeCupola);
  const domeSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 2.8, 24, 8), matGold);
  domeSpire.position.set(0, 91, 62);
  invGroup.add(domeSpire);
  staticCityLandmarks.add(invGroup);

  /**
   * ==========================================================================
   * 4. TRAME HAUSSMANNIENNE ALIGNÉE (STEP = 104 m), TEST 9 POINTS & RUES 3D
   * ==========================================================================
   */
  function isInsideCorridor(x, z, ax, az, bx, bz, halfWidth) {
    const dx = bx - ax;
    const dz = bz - az;
    const lenSq = dx * dx + dz * dz || 1;
    const t = ((x - ax) * dx + (z - az) * dz) / lenSq;
    if (t < -0.05 || t > 1.05) return false;
    const px = ax + t * dx;
    const pz = az + t * dz;
    return Math.hypot(x - px, z - pz) < halfWidth;
  }

  function minBoulevardDistance(x, z) {
    let minD = Infinity;
    for (let i = 0; i < boulevardSegments.length; i++) {
      const seg = boulevardSegments[i];
      const t = Math.max(0, Math.min(1, ((x - seg.ax) * seg.dx + (z - seg.az) * seg.dz) / seg.lenSq));
      const d = Math.hypot(x - (seg.ax + t * seg.dx), z - (seg.az + t * seg.dz));
      if (d < minD) minD = d;
    }
    return minD;
  }

  function isNearBoulevard(x, z, extraMargin = 34) {
    for (let i = 0; i < boulevardSegments.length; i++) {
      const seg = boulevardSegments[i];
      const t = Math.max(0, Math.min(1, ((x - seg.ax) * seg.dx + (z - seg.az) * seg.dz) / seg.lenSq));
      const px = seg.ax + t * seg.dx;
      const pz = seg.az + t * seg.dz;
      if (Math.hypot(x - px, z - pz) < seg.halfW + extraMargin) return true;
    }
    return false;
  }

  const ceDx = concorde.x - arcCoords.x;
  const ceDz = concorde.z - arcCoords.z;
  const ceLen = Math.hypot(ceDx, ceDz) || 1;
  const ceUx = ceDx / ceLen;
  const ceUz = ceDz / ceLen;
  const CHAMPS_CROSS_Z = [135, 310, 485, 675, 865];

  function toChampsLocal(x, z) {
    const dx = x - arcCoords.x;
    const dz = z - arcCoords.z;
    return {
      lx: dx * ceUz - dz * ceUx,
      lz: dx * ceUx + dz * ceUz,
    };
  }

  function isInsideDetailedDistrict(x, z) {
    // Saint-Eustache / Les Halles / Bourse de Commerce / Turbigo (emprise bâtie exacte)
    if (x > -146 && x < 144 && z > -114 && z < 146) return true;
    if (x > -78 && x < 92 && z >= -152 && z <= -36) return true;

    // Tour Eiffel + Champ-de-Mars + École Militaire + Trocadéro
    const edx = x - tourEiffelCenter.x;
    const edz = z - tourEiffelCenter.z;
    const elx = edx * cosEI + edz * sinEI;
    const elz = -edx * sinEI + edz * cosEI;
    if (Math.abs(elx) < 204 && elz > -148 && elz < 880) return true;
    if (Math.abs(elx) < 228 && elz >= 735 && elz < 895) return true;
    if (Math.abs(elx) < 248 && elz < -292 && elz > -648) return true;

    // Place de l'Étoile & Hôtels des Maréchaux (Arc de Triomphe complet)
    if (Math.hypot(x - arcCoords.x, z - arcCoords.z) < 146) return true;

    // Palais Garnier & Place de l'Opéra (modélisé en haute fidélité dans palais-garnier.js)
    const { lx: glx, lz: glz } = toGarnierLocal(x, z);
    if (Math.abs(glx) < 100 && glz > -106 && glz < 194) return true;
    if (Math.abs(glx) < 80 && glz >= 194 && glz < 226) return true;

    // Cathédrale Notre-Dame, Parvis & Square Jean-XXIII sur l'Île de la Cité
    const { lx: ndx, lz: ndz } = toNotreDameLocal(x, z);
    if (ndx > -168 && ndx < 155 && Math.abs(ndz) < 82) return true;

    // Basilique du Sacré-Cœur, Parvis, Square Louise-Michel, Funiculaire, Rue Ronsard & Place du Tertre (Butte Montmartre)
    const slx = x - (-139);
    const slz = z - (-2591);
    if (slx > -148 && slx < 134 && slz > -74 && slz < 292) return true;

    // Le Panthéon, Place du Panthéon, Faculté de Droit, Mairie du 5e, Bibliothèque Sainte-Geneviève, Saint-Étienne-du-Mont & Henri-IV
    const pdx = x - 102;
    const pdz = z - 1913;
    const plx = pdx * 0.9656 - pdz * (-0.2600);
    const plz = pdx * (-0.2600) + pdz * 0.9656;
    if (plx > -126 && plx < 122 && Math.abs(plz) < 98) return true;

    // Axe complet des Champs-Élysées -> Rond-Point -> Jardins & Palais -> Concorde
    const { lx, lz } = toChampsLocal(x, z);
    if (lz >= 142 && lz <= 1105 && Math.abs(lx) < 64) return true;
    if (lz > 1105 && lz <= 1265 && Math.hypot(lx, lz - 1177.6) < 114) return true;
    if (lz > 1265 && lz <= 1988) {
      if (Math.abs(lx) < 134) return true;
      if (lx > -270 && lx < -78 && lz > 1625 && lz < 1795) return true;
    }
    if (lz > 1988 && lz <= 2265 && lx > -128 && lx < 178) return true;
    return false;
  }

  const louvrePos = gpsToMeters(48.8606, 2.3376);
  const cosLouvre = Math.cos(-0.43);
  const sinLouvre = Math.sin(-0.43);
  function isInsideLouvre(px, pz, margin = 0) {
    const dx = px - louvrePos.x;
    const dz = pz - louvrePos.z;
    const lx = dx * cosLouvre - dz * sinLouvre;
    const lz = dx * sinLouvre + dz * cosLouvre;
    return lx > -226 - margin && lx < 164 + margin && Math.abs(lz) < 138 + margin;
  }

  const orsayPos = gpsToMeters(48.8600, 2.3266);
  function isInsideOrsay(px, pz, margin = 0) {
    const dx = px - orsayPos.x;
    const dz = pz - orsayPos.z;
    const lx = dx * cosLouvre - dz * sinLouvre;
    const lz = dx * sinLouvre + dz * cosLouvre;
    return Math.abs(lx) < 116 + margin && Math.abs(lz) < 66 + margin;
  }

  function isPointBlockedForBuilding(px, pz) {
    if (isInsideDetailedDistrict(px, pz)) return true;
    if (isInsideLouvre(px, pz, 14) || isInsideOrsay(px, pz, 10)) return true;
    // Zone radiale de l'Étoile (r = 146 .. 442 m) : urbanisée ci-dessous en îlots trapézoïdaux concentriques
    if (Math.hypot(px - arcCoords.x, pz - arcCoords.z) < 442) return true;

    // Marges Champs-Élysées / rues transversales / Grand & Petit Palais / Concorde
    const { lx, lz } = toChampsLocal(px, pz);
    if (lz >= 100 && lz <= 920 && Math.abs(lx) < 126) {
      for (let i = 0; i < CHAMPS_CROSS_Z.length; i++) {
        if (Math.abs(lz - CHAMPS_CROSS_Z[i]) < 26) return true;
      }
    }
    if (lz > 1240 && lz <= 2005 && Math.abs(lx) < 138) return true;
    if (lz > 1385 && lz < 1805 && lx > -306 && lx < -74) return true;
    if (lz > 1975 && lz <= 2275 && lx > -134 && lx < 182) return true;

    // La Seine + Quais + Voies sur berges (marge 25 m au-delà du lit) & Canal Saint-Martin
    const { dist, hw } = getSeineDistAndHalfWidth(px, pz);
    if (dist < hw + 25) return true;
    if (distanceToPolyline(px, pz, canalPts) < 32) return true;

    // Grands boulevards, Grandes places, Parcs, Cimetières & Gares parisiennes
    if (isNearBoulevard(px, pz, 5.5)) return true;
    for (let i = 0; i < cityPlaces.length; i++) {
      const pl = cityPlaces[i];
      if (Math.hypot(px - pl.x, pz - pl.z) < pl.r + 8) return true;
    }
    for (let i = 0; i < cityParks.length; i++) {
      const pk = cityParks[i];
      const dx = (px - pk.x) / (pk.rx + 12);
      const dz = (pz - pk.z) / (pk.rz + 12);
      if (dx * dx + dz * dz < 1.0) return true;
    }

    // Parcs parisiens & Axe Tuileries / Invalides
    if (isInsideCorridor(px, pz, -800, 120, concorde.x, concorde.z, 150)) return true;
    if (isInsideCorridor(px, pz, -2312, 120, -2390, 1080, 130)) return true;
    if (Math.abs(px - luxPos.x) < 215 && Math.abs(pz - luxPos.z - 20) < 225) return true;
    if (px < -4920) return true;

    // Empreintes des monuments LOD (excluant les 6 monuments complets déjà couverts)
    for (let i = 0; i < MONUMENTS.length; i++) {
      const m = MONUMENTS[i];
      if (m.id === 'tour-eiffel' || m.id === 'saint-eustache' || m.id === 'arc-de-triomphe' || m.id === 'palais-garnier' || m.id === 'notre-dame' || m.id === 'sacre-coeur' || m.id === 'pantheon') continue;
      if (Math.hypot(px - m.pos.x, pz - m.pos.z) < Math.max(48, m.exclusionRadius - 18)) return true;
    }
    return false;
  }

  function canPlaceBlock(cx, cz, bw, bd, rotY) {
    const cosR = Math.cos(rotY);
    const sinR = Math.sin(rotY);
    const hx = bw * 0.5;
    const hz = bd * 0.5;
    const offsets = [
      [0, 0],
      [-hx, -hz],
      [hx, -hz],
      [-hx, hz],
      [hx, hz],
      [-hx, 0],
      [hx, 0],
      [0, -hz],
      [0, hz],
    ];
    for (let i = 0; i < offsets.length; i++) {
      const [ox, oz] = offsets[i];
      const px = cx + ox * cosR + oz * sinR;
      const pz = cz - ox * sinR + oz * cosR;
      if (isPointBlockedForBuilding(px, pz)) return false;
    }
    return true;
  }

  function findNearestUrbanOrientation(x, z, fallbackAngle) {
    let bestDist = 210;
    let bestAngle = fallbackAngle;

    for (let i = 0; i < boulevardSegments.length; i++) {
      const seg = boulevardSegments[i];
      const t = Math.max(0, Math.min(1, ((x - seg.ax) * seg.dx + (z - seg.az) * seg.dz) / seg.lenSq));
      const d = Math.hypot(x - (seg.ax + t * seg.dx), z - (seg.az + t * seg.dz));
      if (d < bestDist) {
        bestDist = d;
        bestAngle = -seg.angle;
      }
    }

    for (let i = 0; i < SEINE_POINTS.length - 1; i++) {
      const a = SEINE_POINTS[i];
      const b = SEINE_POINTS[i + 1];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const l2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / l2));
      const d = Math.hypot(x - (a.x + t * dx), z - (a.z + t * dz));
      if (d < bestDist) {
        bestDist = d;
        bestAngle = -Math.atan2(dz, dx);
      }
    }
    return bestAngle;
  }

  const STEP = 104;
  const COL_MIN = -50;
  const COL_MAX = 42;
  const ROW_MIN = -44;
  const ROW_MAX = 44;
  const occupiedCells = new Set();

  const wingTransforms = [];
  let seed = 17;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  for (let col = COL_MIN; col <= COL_MAX; col++) {
    for (let row = ROW_MIN; row <= ROW_MAX; row++) {
      const x = col * STEP + STEP * 0.5;
      const z = row * STEP + STEP * 0.5;

      // Forme complète de Paris intra-muros (Nord Montmartre, Est Nation/Père-Lachaise, Sud Montparnasse/Denfert/Italie/Montsouris, Ouest 16e)
      const rx = x < 0 ? x / 5250 : x / 4350;
      const rz = z < 0 ? z / 4450 : z / 4550;
      if (rx * rx + rz * rz > 1.06) continue;

      const dBlvd = minBoulevardDistance(x, z);
      const { dist: dSeine } = getSeineDistAndHalfWidth(x, z);
      const nearDiag = dBlvd < 225 || dSeine < 195;

      // Orientation organique par secteur parisien (casse l'effet damier uniforme !)
      const sectorAngle =
        x < -2200 && z > 200
          ? -0.22 // 15e / 16e Sud-Ouest
          : x > 650 && z < -450
            ? 0.16 // 10e / 19e Canal & Villette
            : x > 650 && z > 350
              ? -0.14 // 11e / 12e Bastille / Nation
              : z > 950
                ? 0.11 // Rive Gauche 5e / 13e / 14e
                : z < -1500
                  ? -0.09 // Nord 17e / 18e Montmartre
                  : 0.0;
      const rotY = nearDiag ? findNearestUrbanOrientation(x, z, sectorAngle) : sectorAngle;
      const bw = nearDiag ? 52 + rand() * 8 : 66 + rand() * 9;
      const bd = nearDiag ? 48 + rand() * 7 : 64 + rand() * 9;

      if (!canPlaceBlock(x, z, bw, bd, rotY)) continue;
      occupiedCells.add(`${col},${row}`);

      const cosR = Math.cos(rotY);
      const sinR = Math.sin(rotY);

      const elev = getParisElevation(x, z);
      const montmartreFactor = Math.max(0, Math.min(1, (elev - 28) / 55));
      const hBase = (18.0 + rand() * 6.2) * (1 - montmartreFactor * 0.24) + 0.5;

      // ~4 % d'îlots ordinaires deviennent de charmants squares parisiens arborés de quartier !
      const typoRoll = rand();
      if (typoRoll < 0.042 && dBlvd > 48 && Math.hypot(x, z) > 420) {
        const sqLawn = new THREE.Mesh(createTerrainRectGeometry(x, z, bw * 0.9, bd * 0.9, rotY, 0.14, 3), matParkLawn);
        sqLawn.receiveShadow = true;
        staticCityLandmarks.add(sqLawn);
        const sqPathA = new THREE.Mesh(createTerrainRectGeometry(x, z, bw * 0.92, 5.2, rotY, 0.22, 3), matParkPath);
        staticCityLandmarks.add(sqPathA);
        const sqPathB = new THREE.Mesh(createTerrainRectGeometry(x, z, 5.2, bd * 0.92, rotY, 0.22, 3), matParkPath);
        staticCityLandmarks.add(sqPathB);
        [[-0.28, -0.28], [0.28, -0.28], [-0.28, 0.28], [0.28, 0.28], [0, 0]].forEach(([fx, fz]) => {
          const tx = x + (fx * bw) * cosR + (fz * bd) * sinR;
          const tz = z - (fx * bw) * sinR + (fz * bd) * cosR;
          registerCityTree(tx, tz);
        });
        continue;
      }

      const wingD = nearDiag ? 12.6 + rand() * 2.4 : 14.2 + rand() * 2.8;
      const innerSpan = Math.max(12, bd - wingD * 2);
      const stoneBase = Math.floor(rand() * 8);
      const roofBase = Math.floor(rand() * 8);
      const localWings = [];

      // 6 Typologies architecturales parisiennes variées (casse la répétition de carrés identiques !)
      if (typoRoll < 0.36) {
        // Typo 1 : Îlot découpé en 6 immeubles mitoyens de hauteurs & teintes variées (vrai parcellaire parisien !)
        const hw = bw * 0.48;
        const hd = bd * 0.48;
        localWings.push(
          [-bw * 0.25, -(bd - wingD) * 0.5, hw, wingD, (rand() - 0.5) * 4.2, stoneBase, roofBase],
          [+bw * 0.25, -(bd - wingD) * 0.5, hw, wingD, (rand() - 0.5) * 4.5, (stoneBase + 2) % 8, (roofBase + 1) % 8],
          [-bw * 0.25, +(bd - wingD) * 0.5, hw, wingD, (rand() - 0.5) * 4.4, (stoneBase + 3) % 8, (roofBase + 3) % 8],
          [+bw * 0.25, +(bd - wingD) * 0.5, hw, wingD, (rand() - 0.5) * 4.0, (stoneBase + 1) % 8, (roofBase + 2) % 8],
          [-(bw - wingD) * 0.5, 0, wingD, hd, (rand() - 0.5) * 3.8, (stoneBase + 4) % 8, (roofBase + 4) % 8],
          [+(bw - wingD) * 0.5, 0, wingD, hd, (rand() - 0.5) * 3.8, (stoneBase + 5) % 8, (roofBase + 5) % 8]
        );
      } else if (typoRoll < 0.56) {
        // Typo 2 : Grand îlot Haussmannien fermé classique + arbre de cour intérieure
        localWings.push(
          [0, -(bd - wingD) * 0.5, bw, wingD, 0.2, stoneBase, roofBase],
          [0, +(bd - wingD) * 0.5, bw, wingD, 0.8, stoneBase, roofBase],
          [-(bw - wingD) * 0.5, 0, wingD, innerSpan, -0.6, (stoneBase + 1) % 8, roofBase],
          [+(bw - wingD) * 0.5, 0, wingD, innerSpan, 0.4, (stoneBase + 1) % 8, (roofBase + 1) % 8]
        );
        if (rand() < 0.55) registerCityTree(x, z);
      } else if (typoRoll < 0.72) {
        // Typo 3 : Îlot en U ouvert sur jardin intérieur verdoyant (orienté selon 4 directions)
        const openSide = Math.floor(rand() * 4);
        if (openSide !== 0) localWings.push([0, -(bd - wingD) * 0.5, bw, wingD, 0.4, stoneBase, roofBase]);
        if (openSide !== 1) localWings.push([0, +(bd - wingD) * 0.5, bw, wingD, -0.5, (stoneBase + 2) % 8, (roofBase + 1) % 8]);
        if (openSide !== 2) localWings.push([-(bw - wingD) * 0.5, 0, wingD, innerSpan, 0.6, stoneBase, roofBase]);
        if (openSide !== 3) localWings.push([+(bw - wingD) * 0.5, 0, wingD, innerSpan, -0.3, (stoneBase + 1) % 8, (roofBase + 2) % 8]);
        const cLawn = new THREE.Mesh(createTerrainRectGeometry(x, z, bw * 0.46, bd * 0.46, rotY, 0.13, 2), matParkLawn);
        staticCityLandmarks.add(cLawn);
        registerCityTree(x, z);
      } else if (typoRoll < 0.86) {
        // Typo 4 : Double barre parisienne séparée par une cité / passage piéton arboré
        const verticalBars = rand() < 0.5;
        if (verticalBars) {
          localWings.push(
            [-(bw * 0.30), 0, wingD * 1.15, bd, (rand() - 0.5) * 3.0, stoneBase, roofBase],
            [+(bw * 0.30), 0, wingD * 1.15, bd, (rand() - 0.5) * 3.5, (stoneBase + 3) % 8, (roofBase + 2) % 8]
          );
        } else {
          localWings.push(
            [0, -(bd * 0.30), bw, wingD * 1.15, (rand() - 0.5) * 3.0, stoneBase, roofBase],
            [0, +(bd * 0.30), bw, wingD * 1.15, (rand() - 0.5) * 3.5, (stoneBase + 4) % 8, (roofBase + 3) % 8]
          );
        }
        registerCityTree(x, z);
      } else {
        // Typo 5 : Îlot en L + immeuble d'angle indépendant (pan coupé) + jardin d'angle
        localWings.push(
          [0, -(bd - wingD) * 0.5, bw, wingD, 0.8, stoneBase, roofBase],
          [-(bw - wingD) * 0.5, wingD * 0.5, wingD, bd - wingD, -0.8, (stoneBase + 1) % 8, (roofBase + 1) % 8],
          [+bw * 0.24, +bd * 0.24, bw * 0.42, bd * 0.42, 2.2, (stoneBase + 5) % 8, (roofBase + 4) % 8]
        );
        registerCityTree(x - bw * 0.14 * cosR + bd * 0.14 * sinR, z + bw * 0.14 * sinR + bd * 0.14 * cosR);
      }

      for (let wi = 0; wi < localWings.length; wi++) {
        const [lx, lz, ww, wd, dh, sSeed, rSeed] = localWings[wi];
        const wx = x + lx * cosR + lz * sinR;
        const wz = z - lx * sinR + lz * cosR;
        // Chaque aile épouse exactement la pente locale de Montmartre avec fondation profonde (zéro bâtiment dans le vide !)
        const wingElev = getParisElevation(wx, wz);
        const sink = wingElev > 3.5 ? 6.5 : 0.65;
        wingTransforms.push({
          x: wx,
          y: wingElev - sink,
          z: wz,
          w: ww,
          d: wd,
          h: Math.max(11.5, hBase + dh) + (sink - 0.65),
          rotY,
          stoneSeed: sSeed,
          roofSeed: rSeed,
        });
      }
    }
  }

  /**
   * ==========================================================================
   * URBANISME COMPLET DE L'ÎLE DE LA CITÉ & DE L'ÎLE SAINT-LOUIS
   * Monuments historiques (Sainte-Chapelle, Conciergerie, Palais de Justice,
   * Tribunal de Commerce, Préfecture), Place Dauphine, Île Saint-Louis & 7 ponts
   * ==========================================================================
   */
  const islandTreeCoords = [];
  const samplePolylineSeg = (pts, segIdx, t, lat = 0) => {
    const a = pts[segIdx];
    const b = pts[segIdx + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    const ux = dx / len;
    const uz = dz / len;
    const nx = -uz;
    const nz = ux;
    return {
      x: a.x + dx * t + nx * lat,
      z: a.z + dz * t + nz * lat,
      rotY: -Math.atan2(dz, dx),
    };
  };
  const addIslandBox = (pts, segIdx, t, lat, w, h, d, yBase, mat) => {
    const p = samplePolylineSeg(pts, segIdx, t, lat);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(p.x, yBase + h * 0.5, p.z);
    m.rotation.y = p.rotY;
    m.castShadow = h > 4;
    m.receiveShadow = true;
    staticCityLandmarks.add(m);
    return m;
  };
  const addIslandCyl = (pts, segIdx, t, lat, rt, rb, h, seg, yBase, mat) => {
    const p = samplePolylineSeg(pts, segIdx, t, lat);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
    m.position.set(p.x, yBase + h * 0.5, p.z);
    m.rotation.y = p.rotY;
    m.castShadow = h > 4;
    m.receiveShadow = true;
    staticCityLandmarks.add(m);
    return m;
  };
  const addIslandWing = (pts, segIdx, t, lat, w, d, h, stoneSeed = 0, roofSeed = 0) => {
    const p = samplePolylineSeg(pts, segIdx, t, lat);
    wingTransforms.push({ x: p.x, y: 0.45, z: p.z, w, d, h, rotY: p.rotY, stoneSeed, roofSeed });
  };
  const addIslandTree = (pts, segIdx, t, lat) => {
    const p = samplePolylineSeg(pts, segIdx, t, lat);
    islandTreeCoords.push([p.x, p.z, 0.46]);
  };
  const addIslandBridgeSpan = (pts, segIdx, t, latFrom, latTo, width, style = 'stone') => {
    const latMid = (latFrom + latTo) * 0.5;
    const span = Math.abs(latTo - latFrom);
    const p = samplePolylineSeg(pts, segIdx, t, latMid);
    const deckY = 1.65;
    const stoneMat = style === 'iron' ? matSlate : matBridgeStone;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(width, 1.35, span), stoneMat);
    deck.position.set(p.x, deckY, p.z);
    deck.rotation.y = p.rotY;
    deck.castShadow = true;
    deck.receiveShadow = true;
    staticCityLandmarks.add(deck);
    const road = new THREE.Mesh(new THREE.BoxGeometry(width - 2.6, 0.24, span + 2), matAvenueAsphalt);
    road.position.set(p.x, deckY + 0.72, p.z);
    road.rotation.y = p.rotY;
    staticCityLandmarks.add(road);
    [-width * 0.47, width * 0.47].forEach((ox) => {
      const pp = samplePolylineSeg(pts, segIdx, t, latMid);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.95, span), stoneMat);
      rail.position.set(pp.x + ox * Math.cos(pp.rotY), deckY + 1.15, pp.z - ox * Math.sin(pp.rotY));
      rail.rotation.y = pp.rotY;
      staticCityLandmarks.add(rail);
    });
  };

  // --- 1. POINTE OUEST : SQUARE DU VERT-GALANT, HENRI IV & PLACE DAUPHINE ---
  addIslandBox(citePts, 0, 0.08, 0, 56, 0.25, 34, 0.42, matParkLawn);
  addIslandBox(citePts, 0, 0.08, 0, 48, 0.28, 6, 0.43, matParkPath);
  [0.03, 0.06, 0.09, 0.12].forEach((t) => {
    addIslandTree(citePts, 0, t, -13);
    addIslandTree(citePts, 0, t, 13);
  });
  // Statue équestre d'Henri IV au terre-plein du Pont Neuf
  addIslandBox(citePts, 0, 0.16, 0, 8.5, 4.2, 5.5, 0.45, matBridgeStone);
  addIslandBox(citePts, 0, 0.16, 0, 4.2, 3.2, 2.2, 4.65, matPatinaCopper);

  // Place Dauphine : deux ailes triangulaires Louis XIII & mail planté central
  addIslandBox(citePts, 0, 0.31, 0, 74, 0.24, 34, 0.43, matParkPath);
  addIslandWing(citePts, 0, 0.30, -24, 68, 12.5, 16.5, 1, 1);
  addIslandWing(citePts, 0, 0.30, 24, 68, 12.5, 16.5, 1, 1);
  addIslandWing(citePts, 0, 0.40, -18, 12, 24, 16.5, 0, 2);
  addIslandWing(citePts, 0, 0.40, 18, 12, 24, 16.5, 0, 2);
  [0.24, 0.29, 0.34, 0.39].forEach((t) => {
    addIslandTree(citePts, 0, t, -11);
    addIslandTree(citePts, 0, t, 11);
  });

  // --- 2. PALAIS DE JUSTICE, CONCIERGERIE & SAINTE-CHAPELLE ---
  // Quadrilatère du Palais de Justice & Cour du Mai
  addIslandBox(citePts, 0, 0.69, -4, 138, 0.25, 118, 0.44, matParkPath);
  addIslandBox(citePts, 0, 0.50, -4, 18, 22, 82, 0.45, matParisWhite);
  addIslandBox(citePts, 0, 0.50, -4, 19, 5, 83, 22.45, matSlate);
  addIslandBox(citePts, 0, 0.72, -32, 116, 20, 18, 0.45, matLimestone);
  addIslandBox(citePts, 0, 0.72, -32, 117, 4.8, 19, 20.45, matSlate);
  addIslandBox(citePts, 0, 0.72, 28, 116, 20, 18, 0.45, matLimestone);
  addIslandBox(citePts, 0, 0.72, 28, 117, 4.8, 19, 20.45, matSlate);
  addIslandWing(citePts, 0, 0.64, 52, 86, 15, 20, 0, 0);
  addIslandWing(citePts, 0, 0.85, 52, 58, 15, 20, 2, 1);
  // Aile Est sur le Boulevard du Palais (Cour du Mai & grille dorée)
  addIslandBox(citePts, 0, 0.94, 24, 14, 21, 56, 0.45, matParisWhite);
  addIslandBox(citePts, 0, 0.94, 24, 15, 5.5, 57, 21.45, matSlate);
  addIslandBox(citePts, 0, 0.95, -4, 1.2, 4.5, 42, 0.45, matGold);
  // Pavillon central en coupole du Palais de Justice
  addIslandBox(citePts, 0, 0.68, -4, 26, 26, 26, 0.45, matParisWhite);
  addIslandBox(citePts, 0, 0.68, -4, 20, 9, 20, 26.45, matSlate);
  addIslandCyl(citePts, 0, 0.68, -4, 0.8, 2.2, 6, 8, 35.45, matGold);

  // La Conciergerie (façade gothique sur Quai de l'Horloge + 3 tours poivrières + Tour de l'Horloge)
  addIslandBox(citePts, 0, 0.74, -56, 128, 22, 19, 0.45, matLimestone);
  addIslandBox(citePts, 0, 0.74, -56, 129, 7, 17, 22.45, matSlate);
  [0.62, 0.72, 0.82].forEach((tt) => {
    addIslandCyl(citePts, 0, tt, -66, 4.6, 4.9, 25, 12, 0.45, matLimestone);
    addIslandCyl(citePts, 0, tt, -66, 0.25, 5.2, 9.5, 12, 25.45, matSlate);
  });
  // Tour de l'Horloge (angle NE, 37 m + horloge dorée)
  addIslandBox(citePts, 0, 0.96, -62, 9.5, 31, 9.5, 0.45, matLimestone);
  addIslandBox(citePts, 0, 0.96, -62, 5.5, 8.5, 5.5, 31.45, matSlate);
  addIslandCyl(citePts, 0, 0.975, -62, 1.8, 1.8, 10.2, 12, 20.0, matGold);

  // La Sainte-Chapelle (joyau gothique rayonnant & flèche de 75 m !)
  addIslandBox(citePts, 0, 0.81, 14, 38, 33, 13.5, 0.45, matParisWhite);
  addIslandBox(citePts, 0, 0.81, 14, 34, 24, 14.2, 6.0, matGlassLOD);
  addIslandBox(citePts, 0, 0.81, 14, 38.6, 10.5, 12.6, 33.45, matSlate);
  addIslandCyl(citePts, 0, 0.81, 14, 0.3, 2.2, 32, 8, 42.5, matGold);

  // --- 3. SECTEUR CENTRAL : BOULEVARD DU PALAIS, TRIBUNAL DE COMMERCE, MARCHÉ AUX FLEURS & PRÉFECTURE ---
  addIslandBox(citePts, 1, 0.04, 0, 18, 0.26, 152, 0.44, matAvenueAsphalt);
  addIslandBox(citePts, 1, 0.62, 0, 16, 0.26, 152, 0.44, matAvenueAsphalt);
  // Quais périphériques (Quai de la Corse Nord, Quai du Marché-Neuf Sud)
  addIslandBox(citePts, 0, 0.56, -73, 355, 0.26, 11, 0.44, matAvenueAsphalt);
  addIslandBox(citePts, 0, 0.56, 73, 355, 0.26, 11, 0.44, matAvenueAsphalt);
  addIslandBox(citePts, 1, 0.33, -73, 250, 0.26, 11, 0.44, matAvenueAsphalt);
  addIslandBox(citePts, 1, 0.33, 73, 250, 0.26, 11, 0.44, matAvenueAsphalt);

  // Tribunal de Commerce (quadrilatère + Dôme de 45 m côté Seine)
  addIslandWing(citePts, 1, 0.14, -40, 14, 52, 19.5, 2, 0);
  addIslandWing(citePts, 1, 0.30, -40, 14, 52, 19.5, 2, 0);
  addIslandWing(citePts, 1, 0.22, -16, 62, 14, 19.5, 0, 1);
  addIslandWing(citePts, 1, 0.22, -60, 62, 16, 20.5, 2, 2);
  addIslandCyl(citePts, 1, 0.22, -62, 7.6, 8.2, 11, 16, 20.5, matParisWhite);
  addIslandCyl(citePts, 1, 0.22, -62, 2.6, 7.8, 12.5, 16, 31.5, matPatinaCopper);
  addIslandCyl(citePts, 1, 0.22, -62, 0.3, 1.5, 6.5, 8, 43.5, matGold);

  // Place Louis-Lépine & Marché aux Fleurs Reine-Elizabeth-II
  addIslandBox(citePts, 1, 0.46, -42, 72, 0.24, 58, 0.44, matParkPath);
  [[-55, 0.40], [-32, 0.40], [-55, 0.52], [-32, 0.52]].forEach(([lat, tt]) => {
    addIslandBox(citePts, 1, tt, lat, 22, 4.2, 11, 0.45, matPatinaCopper);
    addIslandBox(citePts, 1, tt, lat, 23, 1.4, 12, 4.65, matSlate);
  });
  [0.39, 0.46, 0.53].forEach((tt) => {
    addIslandTree(citePts, 1, tt, -21);
    addIslandTree(citePts, 1, tt, -66);
  });

  // Cour d'Appel / Bâtiments Sud-Ouest (Quai du Marché-Neuf) & Caserne de la Cité / Préfecture de Police
  addIslandWing(citePts, 1, 0.19, 40, 56, 42, 19.5, 1, 2);
  // Préfecture de Police (fermant tout le côté Ouest du Parvis Notre-Dame !)
  addIslandWing(citePts, 1, 0.44, 54, 108, 16, 20.5, 0, 1);
  addIslandWing(citePts, 1, 0.44, 4, 108, 16, 20.5, 0, 1);
  addIslandWing(citePts, 1, 0.33, 29, 16, 48, 20.5, 2, 0);
  addIslandWing(citePts, 1, 0.55, 29, 16, 48, 21.5, 2, 0);
  [[0.33, 5], [0.55, 5], [0.33, 53], [0.55, 53]].forEach(([tt, lat]) => {
    addIslandBox(citePts, 1, tt, lat, 18, 22.5, 18, 0.45, matParisWhite);
    addIslandBox(citePts, 1, tt, lat, 18.8, 5.5, 18.8, 22.95, matSlate);
  });

  // --- 4. ÎLE SAINT-LOUIS (Rue Saint-Louis-en-l'Île, Hôtels particuliers, Église & Square Barye) ---
  addIslandBox(stLouisPts, 0, 0.52, 0, 260, 0.25, 11, 0.44, matAvenueAsphalt);
  addIslandBox(stLouisPts, 1, 0.48, 0, 240, 0.25, 11, 0.44, matAvenueAsphalt);
  // Quais & rangées d'arbres sur l'Île Saint-Louis
  addIslandBox(stLouisPts, 0, 0.52, -40, 240, 0.25, 8, 0.44, matAvenueAsphalt);
  addIslandBox(stLouisPts, 0, 0.52, 40, 240, 0.25, 8, 0.44, matAvenueAsphalt);
  addIslandBox(stLouisPts, 1, 0.44, -40, 210, 0.25, 8, 0.44, matAvenueAsphalt);
  addIslandBox(stLouisPts, 1, 0.44, 40, 210, 0.25, 8, 0.44, matAvenueAsphalt);

  [0.24, 0.46, 0.68, 0.88].forEach((tt, bi) => {
    addIslandWing(stLouisPts, 0, tt, -23, 44, 24, 17.5 + (bi % 2) * 1.4, bi % 4, bi % 3);
    addIslandWing(stLouisPts, 0, tt, 23, 44, 24, 17.8 + ((bi + 1) % 2) * 1.2, (bi + 1) % 4, (bi + 2) % 3);
  });
  [0.14, 0.36, 0.58].forEach((tt, bi) => {
    addIslandWing(stLouisPts, 1, tt, -22, 42, 23, 17.4 + (bi % 2) * 1.3, (bi + 2) % 4, bi % 3);
    if (bi !== 1) {
      addIslandWing(stLouisPts, 1, tt, 22, 42, 23, 17.6, (bi + 3) % 4, (bi + 1) % 3);
    }
  });
  // Église Saint-Louis-en-l'Île & flèche ajourée (42 m)
  addIslandBox(stLouisPts, 1, 0.36, 22, 34, 18, 16, 0.45, matLimestone);
  addIslandBox(stLouisPts, 1, 0.36, 22, 35, 5, 14, 18.45, matSlate);
  addIslandCyl(stLouisPts, 1, 0.33, 22, 0.2, 2.2, 20, 8, 23.0, matLimestone);
  // Square Barye à la pointe Est de l'Île Saint-Louis
  addIslandBox(stLouisPts, 1, 0.84, 0, 56, 0.28, 34, 0.44, matParkLawn);
  for (let s = 0; s < 7; s++) {
    const t0 = 0.16 + s * 0.12;
    addIslandTree(stLouisPts, 0, t0, -48);
    addIslandTree(stLouisPts, 0, t0, 48);
    if (t0 < 0.90) {
      addIslandTree(stLouisPts, 1, t0, -45);
      addIslandTree(stLouisPts, 1, t0, 45);
    }
  }
  [0.78, 0.86, 0.92].forEach((tt) => {
    addIslandTree(stLouisPts, 1, tt, -12);
    addIslandTree(stLouisPts, 1, tt, 12);
  });

  // Pointe Est de l'Île de la Cité : Mémorial des Martyrs de la Déportation & arbres
  addIslandBox(citePts, 2, 0.84, 0, 46, 0.28, 34, 0.44, matParkLawn);
  addIslandBox(citePts, 2, 0.92, 0, 18, 1.8, 18, 0.45, matLimestone);
  [0.68, 0.78, 0.88].forEach((tt) => {
    addIslandTree(citePts, 2, tt, -22);
    addIslandTree(citePts, 2, tt, 22);
  });

  // --- 5. LES 7 PONTS HISTORIQUES DES DEUX ÎLES (Bras Nord & Bras Sud) ---
  addIslandBridgeSpan(citePts, 1, 0.04, -76, -166, 21, 'stone');   // Pont au Change
  addIslandBridgeSpan(citePts, 1, 0.04, 76, 166, 21, 'stone');     // Pont Saint-Michel
  addIslandBridgeSpan(citePts, 1, 0.46, -76, -166, 18, 'stone');   // Pont Notre-Dame
  addIslandBridgeSpan(stLouisPts, 0, 0.18, -38, -162, 16, 'iron');  // Pont Louis-Philippe
  addIslandBridgeSpan(stLouisPts, 0, 0.64, -52, -162, 15, 'stone'); // Pont Marie
  addIslandBridgeSpan(stLouisPts, 1, 0.24, 52, 162, 16, 'stone');   // Pont de la Tournelle
  // Passerelle / Pont Saint-Louis reliant pointe Est Cité -> pointe Ouest Saint-Louis
  const pCiteTip = citePts[3];
  const pStLStart = stLouisPts[0];
  const stlBridge = new THREE.Mesh(
    new THREE.BoxGeometry(Math.hypot(pStLStart.x - pCiteTip.x, pStLStart.z - pCiteTip.z) + 28, 1.3, 12),
    matBridgeStone
  );
  stlBridge.position.set((pCiteTip.x + pStLStart.x) * 0.5, 1.55, (pCiteTip.z + pStLStart.z) * 0.5);
  stlBridge.rotation.y = -Math.atan2(pStLStart.z - pCiteTip.z, pStLStart.x - pCiteTip.x);
  staticCityLandmarks.add(stlBridge);

  /**
   * ==========================================================================
   * URBANISME RADIAL DU QUARTIER DE L'ÉTOILE (r = 146 .. 442 m)
   * 2 avenues circulaires concentriques + îlots haussmanniens en trapèzes
   * dans les 12 secteurs + pelouses & contre-allées de l'Avenue Foch
   * ==========================================================================
   */
  const etoileSpokeClearance = [60, 17, 18, 19, 18, 30, 24, 17, 17, 19, 18, 19];

  // 1. Avenues circulaires concentriques suivies sur le relief (R2 = 238 m, R3 = 342 m)
  const addEtoileRingRoad = (ringR, halfW) => {
    const segs = 72;
    const rPos = [];
    const rUV = [];
    const rIdx = [];
    let vc = 0;
    for (let i = 0; i < segs; i++) {
      const th0 = concBaseAngle + (i / segs) * Math.PI * 2;
      const th1 = concBaseAngle + ((i + 1) / segs) * Math.PI * 2;
      const thM = (th0 + th1) * 0.5;
      const mx = arcCoords.x + Math.cos(thM) * ringR;
      const mz = arcCoords.z + Math.sin(thM) * ringR;
      const ce = toChampsLocal(mx, mz);
      // Laisse la chaussée & contre-allées des Champs-Élysées intactes (s = 135..1000)
      if (ce.lz > 85 && Math.abs(ce.lx) < 38) continue;

      const c0 = Math.cos(th0);
      const s0 = Math.sin(th0);
      const c1 = Math.cos(th1);
      const s1 = Math.sin(th1);
      const pts4 = [
        [arcCoords.x + c0 * (ringR - halfW), arcCoords.z + s0 * (ringR - halfW)],
        [arcCoords.x + c0 * (ringR + halfW), arcCoords.z + s0 * (ringR + halfW)],
        [arcCoords.x + c1 * (ringR - halfW), arcCoords.z + s1 * (ringR - halfW)],
        [arcCoords.x + c1 * (ringR + halfW), arcCoords.z + s1 * (ringR + halfW)],
      ];
      pts4.forEach(([px, pz]) => {
        rPos.push(px, getParisElevation(px, pz) + 0.036, pz);
      });
      rUV.push(0, i, 1, i, 0, i + 1, 1, i + 1);
      rIdx.push(vc, vc + 2, vc + 1, vc + 1, vc + 2, vc + 3);
      vc += 4;
    }
    if (rIdx.length > 0) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(rPos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(rUV, 2));
      geo.setIndex(rIdx);
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, matRiverRoad);
      mesh.receiveShadow = true;
      staticCityLandmarks.add(mesh);
    }
  };
  addEtoileRingRoad(238, 6.2);
  addEtoileRingRoad(342, 6.2);

  // 2. Pelouses & contre-allées arborées de l'Avenue Foch (k = 5, entre Étoile r = 98 m et r = 640 m)
  {
    const thFoch = concBaseAngle + 5 * (Math.PI / 6);
    const fxU = Math.cos(thFoch);
    const fzU = Math.sin(thFoch);
    const nx = -fzU;
    const nz = fxU;
    const segs = 14;
    const r0 = 96;
    const r1 = 620;
    const lPos = [];
    const lIdx = [];
    let vc = 0;
    [-22.5, 22.5].forEach((lat) => {
      const halfLawn = 5.2;
      for (let s = 0; s < segs; s++) {
        const d0 = r0 + (s / segs) * (r1 - r0);
        const d1 = r0 + ((s + 1) / segs) * (r1 - r0);
        const pts4 = [
          [arcCoords.x + fxU * d0 + nx * (lat - halfLawn), arcCoords.z + fzU * d0 + nz * (lat - halfLawn)],
          [arcCoords.x + fxU * d0 + nx * (lat + halfLawn), arcCoords.z + fzU * d0 + nz * (lat + halfLawn)],
          [arcCoords.x + fxU * d1 + nx * (lat - halfLawn), arcCoords.z + fzU * d1 + nz * (lat - halfLawn)],
          [arcCoords.x + fxU * d1 + nx * (lat + halfLawn), arcCoords.z + fzU * d1 + nz * (lat + halfLawn)],
        ];
        pts4.forEach(([px, pz]) => lPos.push(px, getParisElevation(px, pz) + 0.04, pz));
        lIdx.push(vc, vc + 2, vc + 1, vc + 1, vc + 2, vc + 3);
        vc += 4;
      }
      for (let d = 112; d <= 590; d += 34) {
        const tx = arcCoords.x + fxU * d + nx * lat;
        const tz = arcCoords.z + fzU * d + nz * lat;
        islandTreeCoords.push([tx, tz, getParisElevation(tx, tz)]);
      }
    });
    const fochGeo = new THREE.BufferGeometry();
    fochGeo.setAttribute('position', new THREE.Float32BufferAttribute(lPos, 3));
    fochGeo.setIndex(lIdx);
    fochGeo.computeVertexNormals();
    const fochMesh = new THREE.Mesh(fochGeo, matParkLawn);
    fochMesh.receiveShadow = true;
    staticCityLandmarks.add(fochMesh);
  }

  // 3. Îlots haussmanniens trapézoïdaux à cours dans les 12 secteurs (3 couronnes : 154..224, 250..328, 354..432 m)
  const addEtoileWingIfSafe = (wx, wz, ww, wd, h, rotY, stoneSeed, roofSeed) => {
    const cosR = Math.cos(rotY);
    const sinR = Math.sin(rotY);
    const hx = ww * 0.5;
    const hz = wd * 0.5;
    let minElev = Infinity;
    const corners = [
      [0, 0],
      [-hx, -hz],
      [hx, -hz],
      [-hx, hz],
      [hx, hz],
    ];
    for (let i = 0; i < corners.length; i++) {
      const [ox, oz] = corners[i];
      const px = wx + ox * cosR + oz * sinR;
      const pz = wz - ox * sinR + oz * cosR;
      const ce = toChampsLocal(px, pz);
      // Protège l'emprise Champs-Élysées + ses rues transversales s = 135, 310, 485
      if (ce.lz > 100 && Math.abs(ce.lx) < 60) return;
      for (let c = 0; c < CHAMPS_CROSS_Z.length; c++) {
        if (Math.abs(ce.lx) < 108 && Math.abs(ce.lz - CHAMPS_CROSS_Z[c]) < 15.5) return;
      }
      if (isNearBoulevard(px, pz, 2.2)) return;
      minElev = Math.min(minElev, getParisElevation(px, pz));
    }
    wingTransforms.push({
      x: wx,
      y: minElev - 0.85,
      z: wz,
      w: ww,
      d: wd,
      h,
      rotY,
      stoneSeed,
      roofSeed,
    });
  };

  const etoileBands = [
    { rIn: 156, rOut: 222, wingD: 13.0 },
    { rIn: 252, rOut: 326, wingD: 14.5 },
    { rIn: 356, rOut: 432, wingD: 15.0 },
  ];

  for (let k = 0; k < 12; k++) {
    const kNext = (k + 1) % 12;
    const th0 = concBaseAngle + k * (Math.PI / 6);
    const th1 = concBaseAngle + (k + 1) * (Math.PI / 6);
    const midTh = (th0 + th1) * 0.5;
    const clr0 = etoileSpokeClearance[k];
    const clr1 = etoileSpokeClearance[kNext];

    const u0x = Math.cos(th0);
    const u0z = Math.sin(th0);
    const n0x = -u0z;
    const n0z = u0x; // Pointe vers l'intérieur du secteur depuis l'avenue k

    const u1x = Math.cos(th1);
    const u1z = Math.sin(th1);
    const n1x = u1z;
    const n1z = -u1x; // Pointe vers l'intérieur du secteur depuis l'avenue k+1

    etoileBands.forEach((band, bIdx) => {
      const rMid = (band.rIn + band.rOut) * 0.5;
      const chordSpan = rMid * 2 * Math.sin(Math.PI / 12);
      const clearSpan = chordSpan - clr0 - clr1;
      const radialLen = band.rOut - band.rIn;
      const stoneSeed = (k * 3 + bIdx) % 4;
      const roofSeed = (k + bIdx * 2) % 4;
      const hBase = 19.6 + ((k + bIdx) % 3) * 1.1;

      if (clearSpan < 14) return;

      // Aile alignée côté avenue k (quand la largeur entre avenues permet deux rives ou au moins une aile dédiée)
      const sideD = Math.min(band.wingD, clearSpan * 0.42);
      const lat0 = clr0 + sideD * 0.5;
      addEtoileWingIfSafe(
        arcCoords.x + u0x * rMid + n0x * lat0,
        arcCoords.z + u0z * rMid + n0z * lat0,
        radialLen - 4,
        sideD,
        hBase,
        -th0,
        stoneSeed,
        roofSeed
      );

      // Aile alignée côté avenue k+1 (en symétrie si suffisamment large)
      if (clearSpan >= 30) {
        const lat1 = clr1 + sideD * 0.5;
        addEtoileWingIfSafe(
          arcCoords.x + u1x * rMid + n1x * lat1,
          arcCoords.z + u1z * rMid + n1z * lat1,
          radialLen - 4,
          sideD,
          hBase + 0.6,
          -th1,
          (stoneSeed + 1) % 4,
          roofSeed
        );
      }

      // Ailes transversales avant/arrière bordant les boulevards circulaires (ferment la cour intérieure)
      if (clearSpan >= 42) {
        const capW = Math.min(clearSpan - sideD * 1.85, rMid * 0.34);
        const capD = Math.min(13.5, radialLen * 0.28);
        const cU = Math.cos(midTh);
        const cS = Math.sin(midTh);
        const offTan = (clr0 - clr1) * 0.32;
        const tNx = -cS;
        const tNz = cU;
        if (capW >= 14) {
          addEtoileWingIfSafe(
            arcCoords.x + cU * (band.rIn + capD * 0.5) + tNx * offTan,
            arcCoords.z + cS * (band.rIn + capD * 0.5) + tNz * offTan,
            capW,
            capD,
            hBase + 0.3,
            -midTh + Math.PI * 0.5,
            (stoneSeed + 2) % 4,
            roofSeed
          );
          addEtoileWingIfSafe(
            arcCoords.x + cU * (band.rOut - capD * 0.5) + tNx * offTan,
            arcCoords.z + cS * (band.rOut - capD * 0.5) + tNz * offTan,
            capW,
            capD,
            hBase - 0.3,
            -midTh + Math.PI * 0.5,
            stoneSeed,
            (roofSeed + 1) % 4
          );
        }
        // Arbres dans la cour intérieure de l'îlot & bord de boulevard circulaire
        const treeX = arcCoords.x + cU * rMid + tNx * offTan;
        const treeZ = arcCoords.z + cS * rMid + tNz * offTan;
        islandTreeCoords.push([treeX, treeZ, getParisElevation(treeX, treeZ)]);
      }
    });
  }

  /**
   * Réseau de rues secondaires 3D aligné exactement sur la trame STEP = 104 m,
   * fusionné en géométrie statique avec carrefours propres (0 draw call supplémentaire).
   */
  function keepSecondaryRoadSegment(mx, mz) {
    const { dist: dS, hw: hwS } = getSeineDistAndHalfWidth(mx, mz);
    if (dS < hwS + 11) return false;
    if (isNearBoulevard(mx, mz, -5)) return false;
    if (isInsideLouvre(mx, mz, 6) || isInsideOrsay(mx, mz, 5)) return false;

    // Intérieur des quartiers détaillés & parcs (s'arrête net sur les rues bordantes sans trou ni intrusion)
    if (mx > -136 && mx < 134 && mz > -104 && mz < 136) return false;
    if (mx > -68 && mx < 78 && mz >= -138 && mz <= -36) return false;

    const edx = mx - tourEiffelCenter.x;
    const edz = mz - tourEiffelCenter.z;
    const elx = edx * cosEI + edz * sinEI;
    const elz = -edx * sinEI + edz * cosEI;
    if (Math.abs(elx) < 204 && elz > -635 && elz < 880) return false;
    if (Math.hypot(mx - arcCoords.x, mz - arcCoords.z) < 442) return false;

    const { lx: glx, lz: glz } = toGarnierLocal(mx, mz);
    if (Math.abs(glx) < 98 && glz > -104 && glz < 222) return false;

    const { lx: ndx, lz: ndz } = toNotreDameLocal(mx, mz);
    if (ndx > -168 && ndx < 155 && Math.abs(ndz) < 82) return false;

    const slx = mx - (-139);
    const slz = mz - (-2591);
    if (slx > -148 && slx < 134 && slz > -74 && slz < 292) return false;

    const pdx = mx - 102;
    const pdz = mz - 1913;
    const plx = pdx * 0.9656 - pdz * (-0.2600);
    const plz = pdx * (-0.2600) + pdz * 0.9656;
    if (plx > -126 && plx < 122 && Math.abs(plz) < 98) return false;

    if (distanceToPolyline(mx, mz, canalPts) < 28) return false;
    for (let i = 0; i < cityParks.length; i++) {
      const pk = cityParks[i];
      const dx = (mx - pk.x) / (pk.rx + 8);
      const dz = (mz - pk.z) / (pk.rz + 8);
      if (dx * dx + dz * dz < 1.0) return false;
    }

    const { lx, lz } = toChampsLocal(mx, mz);
    if (lz >= 130 && lz <= 1105 && Math.abs(lx) < 52) return false;
    if (lz > 1105 && lz <= 1265 && Math.hypot(lx, lz - 1177.6) < 92) return false;
    if (lz > 1265 && lz <= 1988) {
      if (Math.abs(lx) < 124) return false;
      if (lx > -280 && lx < -74 && lz > 1405 && lz < 1795) return false;
    }
    if (lz > 1988 && lz <= 2255 && lx > -118 && lx < 136) return false;

    if (isInsideCorridor(mx, mz, -800, 120, concorde.x, concorde.z, 134)) return false;
    if (isInsideCorridor(mx, mz, -2312, 120, -2390, 1080, 114)) return false;
    if (Math.abs(mx - luxPos.x) < 206 && Math.abs(mz - luxPos.z - 20) < 216) return false;
    if (mx < -4920) return false;

    for (let i = 0; i < cityPlaces.length; i++) {
      const pl = cityPlaces[i];
      if (Math.hypot(mx - pl.x, mz - pl.z) < pl.r - 2) return false;
    }
    for (let i = 0; i < MONUMENTS.length; i++) {
      const m = MONUMENTS[i];
      if (m.id === 'tour-eiffel' || m.id === 'saint-eustache' || m.id === 'arc-de-triomphe' || m.id === 'palais-garnier' || m.id === 'notre-dame' || m.id === 'sacre-coeur' || m.id === 'pantheon') continue;
      if (Math.hypot(mx - m.pos.x, mz - m.pos.z) < Math.max(36, m.exclusionRadius - 30)) return false;
    }
    return true;
  }

  function buildNeighborhoodRoadsMesh() {
    const rPos = [];
    const rUV = [];
    const rIdx = [];
    let rVerts = 0;

    const jPos = [];
    const jUV = [];
    const jIdx = [];
    let jVerts = 0;

    const halfRoad = 4.9;
    const subLen = STEP / 4; // 26 m
    const nodeMask = new Map(); // nodeKey -> bitmask (1 = N/S vertical, 2 = E/O horizontal)
    const markNode = (nx, nz, bit) => {
      const k = `${nx},${nz}`;
      nodeMask.set(k, (nodeMask.get(k) || 0) | bit);
    };

    const pushRoadQuad = (xA, zA, xB, zB, xC, zC, xD, zD, v0, v1) => {
      const yA = getParisElevation(xA, zA) + 0.028;
      const yB = getParisElevation(xB, zB) + 0.028;
      const yC = getParisElevation(xC, zC) + 0.028;
      const yD = getParisElevation(xD, zD) + 0.028;
      rPos.push(xA, yA, zA, xB, yB, zB, xC, yC, zC, xD, yD, zD);
      rUV.push(0, v0, 1, v0, 0, v1, 1, v1);
      rIdx.push(rVerts, rVerts + 2, rVerts + 1, rVerts + 1, rVerts + 2, rVerts + 3);
      rVerts += 4;
    };

    // Arêtes verticales (x = col * STEP, z ∈ [row * STEP, (row + 1) * STEP])
    for (let col = COL_MIN; col <= COL_MAX + 1; col++) {
      const x = col * STEP;
      for (let row = ROW_MIN; row <= ROW_MAX; row++) {
        if (!occupiedCells.has(`${col - 1},${row}`) && !occupiedCells.has(`${col},${row}`)) continue;
        const zBase = row * STEP;
        for (let s = 0; s < 4; s++) {
          const z0 = zBase + s * subLen;
          const z1 = z0 + subLen;
          const mz = (z0 + z1) * 0.5;
          if (!keepSecondaryRoadSegment(x, mz)) continue;
          pushRoadQuad(x - halfRoad, z0, x + halfRoad, z0, x - halfRoad, z1, x + halfRoad, z1, z0 / 24, z1 / 24);
          if (s === 0) markNode(col, row, 1);
          if (s === 3) markNode(col, row + 1, 1);
        }
      }
    }

    // Arêtes horizontales (z = row * STEP, x ∈ [col * STEP, (col + 1) * STEP])
    for (let row = ROW_MIN; row <= ROW_MAX + 1; row++) {
      const z = row * STEP;
      for (let col = COL_MIN; col <= COL_MAX; col++) {
        if (!occupiedCells.has(`${col},${row - 1}`) && !occupiedCells.has(`${col},${row}`)) continue;
        const xBase = col * STEP;
        for (let s = 0; s < 4; s++) {
          const x0 = xBase + s * subLen;
          const x1 = x0 + subLen;
          const mx = (x0 + x1) * 0.5;
          if (!keepSecondaryRoadSegment(mx, z)) continue;
          pushRoadQuad(x0, z + halfRoad, x0, z - halfRoad, x1, z + halfRoad, x1, z - halfRoad, x0 / 24, x1 / 24);
          if (s === 0) markNode(col, row, 2);
          if (s === 3) markNode(col + 1, row, 2);
        }
      }
    }

    // Carrés d'intersection sans pointillés uniquement où s'entrecroisent voies X et Z
    const jHalf = 6.3;
    nodeMask.forEach((mask, key) => {
      if (mask !== 3) return;
      const [cStr, rStr] = key.split(',');
      const nx = Number(cStr) * STEP;
      const nz = Number(rStr) * STEP;
      const yA = getParisElevation(nx - jHalf, nz - jHalf) + 0.035;
      const yB = getParisElevation(nx + jHalf, nz - jHalf) + 0.035;
      const yC = getParisElevation(nx - jHalf, nz + jHalf) + 0.035;
      const yD = getParisElevation(nx + jHalf, nz + jHalf) + 0.035;
      jPos.push(
        nx - jHalf, yA, nz - jHalf,
        nx + jHalf, yB, nz - jHalf,
        nx - jHalf, yC, nz + jHalf,
        nx + jHalf, yD, nz + jHalf
      );
      jUV.push(0, 0, 1, 0, 0, 1, 1, 1);
      jIdx.push(jVerts, jVerts + 2, jVerts + 1, jVerts + 1, jVerts + 2, jVerts + 3);
      jVerts += 4;
    });

    if (rIdx.length > 0) {
      const roadGridGeo = new THREE.BufferGeometry();
      roadGridGeo.setAttribute('position', new THREE.Float32BufferAttribute(rPos, 3));
      roadGridGeo.setAttribute('uv', new THREE.Float32BufferAttribute(rUV, 2));
      roadGridGeo.setIndex(rIdx);
      roadGridGeo.computeVertexNormals();
      const roadGridMesh = new THREE.Mesh(roadGridGeo, matRiverRoad);
      roadGridMesh.receiveShadow = true;
      staticCityLandmarks.add(roadGridMesh);
    }

    if (jIdx.length > 0) {
      const juncGeo = new THREE.BufferGeometry();
      juncGeo.setAttribute('position', new THREE.Float32BufferAttribute(jPos, 3));
      juncGeo.setAttribute('uv', new THREE.Float32BufferAttribute(jUV, 2));
      juncGeo.setIndex(jIdx);
      juncGeo.computeVertexNormals();
      const juncMesh = new THREE.Mesh(juncGeo, matRoadJunction);
      juncMesh.receiveShadow = true;
      staticCityLandmarks.add(juncMesh);
    }
  }

  buildNeighborhoodRoadsMesh();

  const count = wingTransforms.length;
  const matHaussLOD = new THREE.MeshStandardMaterial({
    map: createCityHaussmannLODTexture(),
    emissive: new THREE.Color(0xffc470),
    emissiveMap: createCityHaussmannEmissiveTexture(),
    emissiveIntensity: 0.04,
    roughness: 0.84,
  });
  const matZincLOD = new THREE.MeshStandardMaterial({
    map: createZincMansardTexture(),
    color: 0xe6eff8,
    roughness: 0.44,
    metalness: 0.12,
  });

  const bodyInstanced = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), matHaussLOD, count);
  const roofInstanced = new THREE.InstancedMesh(createMansardRoofGeometry(), matZincLOD, count);
  bodyInstanced.receiveShadow = true;
  roofInstanced.receiveShadow = false;

  const stonePalette = [
    new THREE.Color(0xf6efe2), // Pierre de taille lutétienne claire
    new THREE.Color(0xede0c8), // Pierre blonde chaude Haussmann
    new THREE.Color(0xfaf4e8), // Calcaire ivoire lumineux
    new THREE.Color(0xdfd3be), // Pierre grise patinée
    new THREE.Color(0xead4b8), // Enduit faubourg ocre-sable
    new THREE.Color(0xdcc2b2), // Brique & pierre rosée (10e/11e/18e)
    new THREE.Color(0xe6dfd3), // Pierre claire moderne
    new THREE.Color(0xd6c7ae), // Pierre ancienne du Marais
  ];
  const roofPalette = [
    new THREE.Color(0x7c8d9e), // Zinc gris-bleu classique
    new THREE.Color(0x5f6d7d), // Ardoise d'Angers sombre
    new THREE.Color(0x95a4b2), // Zinc clair argenté
    new THREE.Color(0x4b5664), // Ardoise anthracite
    new THREE.Color(0x8e5642), // Tuile brun-rouge faubourg / Montmartre
    new THREE.Color(0x6b7f7c), // Zinc patiné gris-vert
    new THREE.Color(0xa6b2bc), // Zinc perle lumineux
    new THREE.Color(0x705c54), // Tuile brune ancienne
  ];

  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const b = wingTransforms[i];
    dummy.position.set(b.x, b.y + b.h * 0.5, b.z);
    dummy.rotation.set(0, b.rotY, 0);
    dummy.scale.set(b.w, b.h, b.d);
    dummy.updateMatrix();
    bodyInstanced.setMatrixAt(i, dummy.matrix);
    bodyInstanced.setColorAt(i, stonePalette[b.stoneSeed]);

    const roofH = 3.2 + (i % 3) * 0.45;
    dummy.position.set(b.x, b.y + b.h + roofH * 0.5, b.z);
    dummy.scale.set(b.w + 0.5, roofH, b.d + 0.5);
    dummy.updateMatrix();
    roofInstanced.setMatrixAt(i, dummy.matrix);
    roofInstanced.setColorAt(i, roofPalette[b.roofSeed]);
  }
  bodyInstanced.instanceMatrix.needsUpdate = true;
  if (bodyInstanced.instanceColor) bodyInstanced.instanceColor.needsUpdate = true;
  roofInstanced.instanceMatrix.needsUpdate = true;
  if (roofInstanced.instanceColor) roofInstanced.instanceColor.needsUpdate = true;
  worldGroup.add(bodyInstanced);
  worldGroup.add(roofInstanced);

  // --- ARBRES DES GRANDS BOULEVARDS & PARCS VIA 2 InstancedMesh (2 DRAW CALLS) ---
  const filteredTrees = cityTreeCoords.filter(([tx, tz]) => {
    if (isInsideDetailedDistrict(tx, tz)) return false;
    if (isInsideLouvre(tx, tz, 4) || isInsideOrsay(tx, tz, 4)) return false;
    if (distanceToPolyline(tx, tz, SEINE_POINTS) < 82) return false;
    if (isNearBoulevard(tx, tz, -0.8)) return false;
    if (Math.hypot(tx - invPos.x, tz - invPos.z) < 92) return false;
    for (let i = 0; i < MONUMENTS.length; i++) {
      const m = MONUMENTS[i];
      if (m.id === 'tour-eiffel' || m.id === 'saint-eustache' || m.id === 'arc-de-triomphe' || m.id === 'palais-garnier' || m.id === 'notre-dame' || m.id === 'sacre-coeur' || m.id === 'pantheon') continue;
      if (Math.hypot(tx - m.pos.x, tz - m.pos.z) < 62) return false;
    }
    return true;
  });

  const allTreePlacements = [
    ...filteredTrees.map(([tx, tz]) => [tx, tz, getParisElevation(tx, tz)]),
    ...islandTreeCoords,
  ];

  if (allTreePlacements.length > 0) {
    const matCityTrunk = new THREE.MeshStandardMaterial({ color: 0x534030, roughness: 0.92 });
    const matCityLeaf = new THREE.MeshStandardMaterial({ color: 0x527a3f, roughness: 0.85 });
    const cityTrunksInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.24, 0.38, 4.6, 6), matCityTrunk, allTreePlacements.length);
    const cityCrownsInst = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(3.0, 1), matCityLeaf, allTreePlacements.length);
    cityTrunksInst.castShadow = false;
    cityCrownsInst.castShadow = false;
    cityCrownsInst.receiveShadow = true;

    const leafTint = new THREE.Color();
    allTreePlacements.forEach(([tx, tz, ty], idx) => {
      const sc = 0.88 + ((idx * 17) % 7) * 0.06;
      dummy.rotation.set(0, (idx * 1.1) % (Math.PI * 2), 0);
      dummy.position.set(tx, ty + 2.2 * sc, tz);
      dummy.scale.set(sc, sc, sc);
      dummy.updateMatrix();
      cityTrunksInst.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(tx, ty + 5.8 * sc, tz);
      dummy.scale.set(sc * 1.15, sc * 0.92, sc * 1.12);
      dummy.updateMatrix();
      cityCrownsInst.setMatrixAt(idx, dummy.matrix);

      const sTone = 0.86 + ((idx * 23) % 14) * 0.018;
      leafTint.setRGB(sTone * 0.92, sTone * 1.05, sTone * 0.82);
      cityCrownsInst.setColorAt(idx, leafTint);
    });
    cityTrunksInst.instanceMatrix.needsUpdate = true;
    cityCrownsInst.instanceMatrix.needsUpdate = true;
    if (cityCrownsInst.instanceColor) cityCrownsInst.instanceColor.needsUpdate = true;
    worldGroup.add(cityTrunksInst);
    worldGroup.add(cityCrownsInst);
  }

  /**
   * ==========================================================================
   * 5. SILHOUETTES LOD RECONNAISSABLES DES 10 AUTRES MONUMENTS (ÉCHELLE 1:1)
   * ==========================================================================
   */
  function addLODBox(parent, w, h, d, x, y, z, mat) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  function addLODCyl(parent, rt, rb, h, seg, x, y, z, mat) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  function buildMonumentLOD(m) {
    const g = new THREE.Group();
    g.position.copy(m.pos);
    g.name = `LOD_${m.id}`;

    switch (m.id) {
      case 'pompidou': {
        // Centre Georges-Pompidou (166m x 60m x 42m) + Piazza Beaubourg pavée + tuyaux colorés + chenille vitrée
        const piazza = new THREE.Mesh(new THREE.BoxGeometry(112, 0.25, 178), matParkPath);
        piazza.position.set(-20, 0.05, 0);
        piazza.receiveShadow = true;
        g.add(piazza);
        addLODBox(g, 56, 42, 160, 0, 21, 0, matGlassLOD);
        addLODBox(g, 58, 4, 162, 0, 42, 0, matParisWhite);
        // Exosquelette métallique blanc
        for (let z = -72; z <= 72; z += 18) {
          addLODBox(g, 60, 43, 1.5, 0, 21.5, z, matParisWhite);
        }
        // Tubes emblématiques (Bleu, Rouge, Jaune, Vert)
        const matBlue = new THREE.MeshStandardMaterial({ color: 0x1e5eb8, roughness: 0.4 });
        const matRed = new THREE.MeshStandardMaterial({ color: 0xc92828, roughness: 0.4 });
        const matYellow = new THREE.MeshStandardMaterial({ color: 0xe8b525, roughness: 0.4 });
        const matGreen = new THREE.MeshStandardMaterial({ color: 0x248c52, roughness: 0.4 });
        addLODBox(g, 4, 4, 150, 29, 34, 0, matBlue);
        addLODBox(g, 4, 4, 150, 29, 26, 0, matGreen);
        addLODBox(g, 4, 4, 150, 29, 18, 0, matYellow);
        addLODBox(g, 5, 42, 5, 29, 21, -24, matRed);
        // Chenille vitrée diagonale sur la Piazza
        const caterpillar = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 145, 10), matGlassLOD);
        caterpillar.position.set(-30, 22, 0);
        caterpillar.rotation.x = Math.PI * 0.28;
        g.add(caterpillar);
        break;
      }

      case 'notre-dame': {
        // Cathédrale Notre-Dame de Paris (127m de long, 2 tours Ouest 69m, flèche 96m) + Parvis
        g.rotation.y = -0.22;
        const ndParvis = new THREE.Mesh(new THREE.BoxGeometry(190, 0.25, 110), matParkPath);
        ndParvis.position.set(-34, 0.5, 0);
        ndParvis.receiveShadow = true;
        g.add(ndParvis);
        addLODBox(g, 118, 34, 44, 0, 17, 0, matLimestone);
        addLODBox(g, 110, 14, 24, 4, 41, 0, matSlate);
        // Transept
        addLODBox(g, 18, 35, 62, 8, 17.5, 0, matLimestone);
        // Deux tours occidentales (69m)
        [-14, 14].forEach((tz) => {
          addLODBox(g, 16, 69, 16, -54, 34.5, tz, matLimestone);
        });
        // Flèche de Viollet-le-Duc (culminant à 96m)
        addLODCyl(g, 0.4, 3.5, 48, 8, 8, 72, 0, matLeadFromWorld());
        break;
      }

      case 'louvre': {
        // Musée du Louvre : Cour Napoléon orientée vers les Tuileries (-0.43 rad) + Pyramide de verre (21.6m)
        g.rotation.y = -0.43;
        const courParvis = new THREE.Mesh(new THREE.BoxGeometry(380, 0.3, 250), matParkPath);
        courParvis.position.set(-30, 0.05, 0);
        courParvis.receiveShadow = true;
        g.add(courParvis);
        // Aile Sully (Est)
        addLODBox(g, 42, 24, 220, 130, 12, 0, matLimestone);
        addLODBox(g, 38, 8, 216, 130, 28, 0, matSlate);
        // Aile Richelieu (Nord) & Aile Denon (Sud)
        [-115, 115].forEach((az) => {
          addLODBox(g, 340, 22, 36, -40, 11, az, matLimestone);
          addLODBox(g, 336, 7, 32, -40, 25.5, az, matSlate);
        });
        // Pyramide du Louvre (35m base × 21.6m haut)
        const pyr = new THREE.Mesh(new THREE.ConeGeometry(25, 21.6, 4), matGlassLOD);
        pyr.position.set(10, 10.8, 0);
        pyr.rotation.y = Math.PI * 0.25;
        g.add(pyr);
        break;
      }

      case 'orsay': {
        // Musée d'Orsay : nef Beaux-Arts voûtée (175m × 75m) + Parvis Bellechasse
        g.rotation.y = -0.43;
        const orsayParvis = new THREE.Mesh(new THREE.BoxGeometry(220, 0.25, 120), matParkPath);
        orsayParvis.position.set(0, 0.05, 0);
        orsayParvis.receiveShadow = true;
        g.add(orsayParvis);
        addLODBox(g, 175, 24, 72, 0, 12, 0, matLimestone);
        const vault = new THREE.Mesh(new THREE.CylinderGeometry(24, 24, 165, 16, 1, false, 0, Math.PI), matGlassLOD);
        vault.rotation.z = Math.PI * 0.5;
        vault.position.set(0, 24, 0);
        g.add(vault);
        break;
      }

      case 'palais-garnier': {
        // Palais Garnier : façade Second Empire + grande coupole verte + fronton doré + Place de l'Opéra
        const opParvis = new THREE.Mesh(new THREE.BoxGeometry(156, 0.25, 188), matParkPath);
        opParvis.position.set(0, 0.05, 12);
        opParvis.receiveShadow = true;
        g.add(opParvis);
        addLODBox(g, 98, 28, 135, 0, 14, 0, matLimestone);
        addLODCyl(g, 24, 26, 12, 24, 0, 34, -8, matLimestone);
        const dome = new THREE.Mesh(new THREE.SphereGeometry(23.5, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), matPatinaCopper);
        dome.position.set(0, 39, -8);
        g.add(dome);
        // Fronton scène & Apollon doré
        addLODBox(g, 48, 18, 24, 0, 37, -36, matLimestone);
        addLODCyl(g, 0.8, 1.5, 7, 8, 0, 52, -8, matGold);
        break;
      }

      case 'pantheon': {
        // Le Panthéon sur la Montagne Sainte-Geneviève (+26m) + Place du Panthéon
        const panthParvis = new THREE.Mesh(new THREE.BoxGeometry(200, 0.4, 148), matParkPath);
        panthParvis.position.set(-22, -0.05, 0);
        panthParvis.receiveShadow = true;
        g.add(panthParvis);
        addLODBox(g, 110, 24, 84, 0, 12, 0, matLimestone);
        // Péristyle Ouest à fronton
        addLODBox(g, 16, 26, 42, -60, 13, 0, matLimestone);
        // Tambour à colonnade + grande coupole culminant à 83m
        addLODCyl(g, 18, 19, 24, 24, 0, 36, 0, matLimestone);
        const pDome = new THREE.Mesh(new THREE.SphereGeometry(18, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), matSlate);
        pDome.position.set(0, 48, 0);
        g.add(pDome);
        addLODCyl(g, 2.8, 3.6, 14, 12, 0, 72, 0, matLimestone);
        break;
      }

      case 'grand-palais': {
        // Grand Palais : immense nef à verrière courbée vert-de-gris + Parvis Winston-Churchill
        g.rotation.y = -0.45;
        const gpParvis = new THREE.Mesh(new THREE.BoxGeometry(230, 0.25, 145), matParkPath);
        gpParvis.position.set(0, 0.05, 0);
        gpParvis.receiveShadow = true;
        g.add(gpParvis);
        addLODBox(g, 185, 22, 86, 0, 11, 0, matLimestone);
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(32, 32, 168, 20, 1, false, 0, Math.PI), matGlassLOD);
        barrel.rotation.z = Math.PI * 0.5;
        barrel.position.set(0, 22, 0);
        g.add(barrel);
        addLODBox(g, 38, 18, 110, 0, 18, 0, matGlassLOD);
        break;
      }

      case 'arc-de-triomphe': {
        // Arc de Triomphe de l'Étoile (50m × 45m × 22m) au sommet de la Place de l'Étoile (+18m)
        g.rotation.y = champsAngle + Math.PI * 0.5;
        // 4 piliers formant la grande voûte centrale & voûte transversale
        addLODBox(g, 14, 38, 22, -15.5, 19, 0, matLimestone);
        addLODBox(g, 14, 38, 22, +15.5, 19, 0, matLimestone);
        addLODBox(g, 45, 12, 22, 0, 44, 0, matLimestone);
        addLODBox(g, 48, 3, 25, 0, 38.5, 0, matBridgeStone);
        // Rond-point de l'Étoile (anneau chaussée + esplanade pierre au-dessus des avenues)
        const etoileRoad = new THREE.Mesh(new THREE.CylinderGeometry(126, 126, 0.30, 40), matAvenueAsphalt);
        etoileRoad.position.y = 0.12;
        etoileRoad.receiveShadow = true;
        g.add(etoileRoad);
        const plaza = new THREE.Mesh(new THREE.CylinderGeometry(72, 72, 0.36, 36), matParkPath);
        plaza.position.y = 0.18;
        plaza.receiveShadow = true;
        g.add(plaza);
        break;
      }

      case 'sacre-coeur': {
        // Basilique du Sacré-Cœur de Montmartre + Parvis + Square Louise-Michel en gradins verts
        const scParvis = new THREE.Mesh(new THREE.BoxGeometry(120, 0.5, 140), matParkPath);
        scParvis.position.set(0, -0.2, 6);
        scParvis.receiveShadow = true;
        g.add(scParvis);
        for (let t = 0; t < 4; t++) {
          const terr = new THREE.Mesh(new THREE.BoxGeometry(118, 2.2, 24), matParkLawn);
          terr.position.set(0, -5.0 - t * 4.5, 78 + t * 22);
          terr.receiveShadow = true;
          g.add(terr);
        }
        addLODBox(g, 64, 24, 88, 0, 12, 0, matParisWhite);
        // Dôme central ovoïde (hauteur totale ~83m au-dessus du parvis de la butte)
        addLODCyl(g, 11, 13, 18, 20, 0, 33, 0, matParisWhite);
        const mainDome = new THREE.Mesh(new THREE.SphereGeometry(11.5, 22, 14), matParisWhite);
        mainDome.scale.set(1, 1.55, 1);
        mainDome.position.set(0, 46, 0);
        g.add(mainDome);
        addLODCyl(g, 2.2, 3.0, 14, 12, 0, 68, 0, matParisWhite);
        // 4 coupoles satellites
        [[-16, 18], [16, 18], [-16, -18], [16, -18]].forEach(([dx, dz]) => {
          const sd = new THREE.Mesh(new THREE.SphereGeometry(6.5, 14, 10), matParisWhite);
          sd.scale.set(1, 1.4, 1);
          sd.position.set(dx, 30, dz);
          g.add(sd);
        });
        // Campanile au Nord
        addLODBox(g, 14, 62, 14, 0, 31, -48, matParisWhite);
        const campDome = new THREE.Mesh(new THREE.SphereGeometry(6.5, 14, 10), matParisWhite);
        campDome.scale.set(1, 1.5, 1);
        campDome.position.set(0, 66, -48);
        g.add(campDome);
        break;
      }

      case 'fondation-lv': {
        // Fondation Louis Vuitton (Frank Gehry) : 12 grandes voiles courbes de verre
        addLODBox(g, 115, 18, 42, 0, 9, 0, matParisWhite);
        for (let s = 0; s < 10; s++) {
          const sail = new THREE.Mesh(new THREE.BoxGeometry(24 + (s % 3) * 8, 36 + (s % 2) * 8, 1.2), matGlassLOD);
          sail.position.set(-48 + s * 11, 24, (s % 2 === 0 ? 14 : -14));
          sail.rotation.set((s % 2 === 0 ? -0.22 : 0.22), (s - 4.5) * 0.14, (s % 3 - 1) * 0.16);
          g.add(sail);
        }
        break;
      }

      default:
        break;
    }

    staticCityLandmarks.add(g);
  }

  const matLeadShared = new THREE.MeshStandardMaterial({ color: 0x525a64, roughness: 0.48, metalness: 0.45 });
  function matLeadFromWorld() {
    return matLeadShared;
  }

  MONUMENTS.filter((m) => m.status === 'lod').forEach(buildMonumentLOD);

  // Fusion statique des quais, ponts, parcs et 10 monuments LOD en ~12 draw calls sans aucune perte visuelle
  mergeStaticGroupByMaterial(staticCityLandmarks);

  /**
   * ==========================================================================
   * 6. BATEAUX-MOUCHES ANIMÉS NAVIGUANT SUR LA SEINE
   * ==========================================================================
   */
  const boats = [];
  const matBoatHull = new THREE.MeshStandardMaterial({ color: 0x1d2633, roughness: 0.55 });
  const matBoatCabin = new THREE.MeshStandardMaterial({
    color: 0xfff0c4,
    emissive: new THREE.Color(0xffbe5c),
    emissiveIntensity: 0.25,
    roughness: 0.25,
    transparent: true,
    opacity: 0.85,
  });
  emissiveNightMaterials.push(matBoatCabin);

  // Calcul de longueur cumulée sur SEINE_POINTS pour l'interpolation uniforme
  const riverSegLengths = [];
  let totalRiverLen = 0;
  for (let i = 0; i < SEINE_POINTS.length - 1; i++) {
    const l = Math.hypot(SEINE_POINTS[i + 1].x - SEINE_POINTS[i].x, SEINE_POINTS[i + 1].z - SEINE_POINTS[i].z);
    riverSegLengths.push(l);
    totalRiverLen += l;
  }

  function sampleRiverAt(distAlong, lateralOffset) {
    let d = ((distAlong % totalRiverLen) + totalRiverLen) % totalRiverLen;
    for (let i = 0; i < riverSegLengths.length; i++) {
      const segLen = riverSegLengths[i];
      if (d <= segLen || i === riverSegLengths.length - 1) {
        const t = d / segLen;
        const p0 = SEINE_POINTS[i];
        const p1 = SEINE_POINTS[i + 1];
        const dx = p1.x - p0.x;
        const dz = p1.z - p0.z;
        const nx = -dz / segLen;
        const nz = dx / segLen;
        return {
          x: THREE.MathUtils.lerp(p0.x, p1.x, t) + nx * lateralOffset,
          z: THREE.MathUtils.lerp(p0.z, p1.z, t) + nz * lateralOffset,
          yaw: Math.atan2(dx, dz),
        };
      }
      d -= segLen;
    }
    return { x: SEINE_POINTS[0].x, z: SEINE_POINTS[0].z, yaw: 0 };
  }

  const matWake = new THREE.MeshBasicMaterial({
    color: 0xeaf6ff,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
  });
  const wakeGeo = new THREE.PlaneGeometry(8.5, 22);
  wakeGeo.rotateX(-Math.PI * 0.5);

  for (let b = 0; b < 5; b++) {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.8, 34), matBoatHull);
    hull.position.y = 0.55;
    boat.add(hull);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.85, 24), matBoatCabin);
    cabin.position.y = 1.95;
    boat.add(cabin);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.25, 26), matParisWhite);
    deck.position.y = 2.95;
    boat.add(deck);
    const wake = new THREE.Mesh(wakeGeo, matWake);
    wake.position.set(0, 0.08, -26);
    boat.add(wake);
    worldGroup.add(boat);

    boats.push({
      mesh: boat,
      dist: (b / 5) * totalRiverLen,
      dir: b % 2 === 0 ? 1 : -1,
      speed: 7.5 + (b % 3) * 1.4,
      lateral: b % 2 === 0 ? 22 : -22,
    });
  }

  let activeBoatCount = boats.length;

  function setMaxBoats(n) {
    activeBoatCount = THREE.MathUtils.clamp(n, 0, boats.length);
    for (let i = 0; i < boats.length; i++) {
      boats[i].mesh.visible = i < activeBoatCount;
    }
  }

  const dayHoriz = new THREE.Color(0xa6c4db);
  const nightHoriz = new THREE.Color(0x0c1628);
  const dayZen = new THREE.Color(0x4779a8);
  const nightZen = new THREE.Color(0x050a14);

  function update(dt, nightFactor = 0.1, sunDir = null, fogColor = null, fogDensity = null) {
    const clampedDt = Math.min(dt, 0.05);
    waterMat.uniforms.uTime.value += clampedDt;
    waterMat.uniforms.uNightFactor.value = nightFactor;
    if (sunDir) waterMat.uniforms.uSunDir.value.copy(sunDir);
    if (fogColor) waterMat.uniforms.uFogColor.value.copy(fogColor);
    if (fogDensity !== null) waterMat.uniforms.uFogDensity.value = fogDensity;
    waterMat.uniforms.uSkyHorizon.value.copy(dayHoriz).lerp(nightHoriz, nightFactor);
    waterMat.uniforms.uSkyZenith.value.copy(dayZen).lerp(nightZen, nightFactor);

    matBoatCabin.emissiveIntensity = 0.2 + nightFactor * 1.8;
    matHaussLOD.emissiveIntensity = Math.max(0, (nightFactor - 0.14) / 0.86) * 0.95;
    matMontparnasse.emissiveIntensity = 0.06 + Math.max(0, (nightFactor - 0.12) / 0.88) * 1.15;

    for (let i = 0; i < boats.length; i++) {
      const bt = boats[i];
      if (!bt.mesh.visible) continue;
      bt.dist += bt.dir * bt.speed * clampedDt;
      const sample = sampleRiverAt(bt.dist, bt.lateral);
      bt.mesh.position.set(sample.x, -2.18, sample.z);
      bt.mesh.rotation.y = bt.dir > 0 ? sample.yaw : sample.yaw + Math.PI;
    }
  }

  return {
    worldGroup,
    setMaxBoats,
    update,
  };
}
