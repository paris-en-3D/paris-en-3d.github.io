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

  // Élargissement naturel autour de l'Île de la Cité (index 3) et Pont Neuf (index 4)
  const seineWidthFn = (i) => (i === 2 || i === 3 || i === 4 ? 128 : 74);

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

    // Dépression locale à -0,38 m (avec transition 18 m) sous les dalles basses Saint-Eustache & Tour Eiffel
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

    const localDepress = Math.max(eustBlend, eiffBlend);
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
  const citeGeo = createIslandWithWallsGeometry(citePts, (i) => (i === 0 || i === 3 ? 32 : 76), -5.8, 0.45);
  const citeMesh = new THREE.Mesh(citeGeo, matQuayStone);
  citeMesh.receiveShadow = true;
  staticCityLandmarks.add(citeMesh);

  // Île Saint-Louis (juste à l'Est de l'Île de la Cité)
  const stLouisPts = [
    gpsToMeters(48.8522, 2.3545),
    gpsToMeters(48.8512, 2.3585),
    gpsToMeters(48.8501, 2.3612),
  ];
  const stLouisGeo = createIslandWithWallsGeometry(stLouisPts, (i) => (i === 1 ? 58 : 28), -5.8, 0.45);
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

  // Jardin du Luxembourg (à l'Ouest du Panthéon)
  const luxPos = gpsToMeters(48.8462, 2.3371);
  const luxElev = getParisElevation(luxPos.x, luxPos.z);
  addFlatZone(420, 440, luxPos.x, luxPos.z + 20, matParkLawn, 0, luxElev + 0.05);

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
        gpsToMeters(48.8706, 2.3322),
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
    { width: 24, trees: true, pts: [gpsToMeters(48.8474, 2.3412), gpsToMeters(48.8463, 2.3446)] },
    // Avenue de Breteuil (au Sud du Dôme des Invalides)
    { width: 42, trees: true, pts: [gpsToMeters(48.8522, 2.3122), gpsToMeters(48.8435, 2.3115)] },
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
    }
  }

  addCircularPlaza({ lat: 48.8674, lon: 2.3638, r: 68, ornament: 'statue' });        // Place de la République
  addCircularPlaza({ lat: 48.8532, lon: 2.3692, r: 66, ornament: 'column-gold' });   // Place de la Bastille
  addCircularPlaza({ lat: 48.8675, lon: 2.3294, r: 56, ornament: 'column-bronze' }); // Place Vendôme
  addCircularPlaza({ lat: 48.8698, lon: 2.3245, r: 64, ornament: 'temple' });        // Place de la Madeleine
  addCircularPlaza({ lat: 48.8704, lon: 2.3324, r: 56, ornament: 'none' });          // Place de l'Opéra
  addCircularPlaza({ lat: 48.8584, lon: 2.3474, r: 52, ornament: 'column-gold' });   // Place du Châtelet

  // Parc Monceau (grand parc vert arboré)
  const monceauPos = gpsToMeters(48.8794, 2.3088);
  cityPlaces.push({ x: monceauPos.x, z: monceauPos.z, r: 115 });
  const monceauLawn = new THREE.Mesh(new THREE.CylinderGeometry(112, 114, 0.22, 32), matParkLawn);
  monceauLawn.position.set(monceauPos.x, getParisElevation(monceauPos.x, monceauPos.z) + 0.04, monceauPos.z);
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

  function isPointBlockedForBuilding(px, pz) {
    if (isInsideDetailedDistrict(px, pz)) return true;

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

    // La Seine + Quais + Voies sur berges (marge 25 m au-delà du lit)
    const { dist, hw } = getSeineDistAndHalfWidth(px, pz);
    if (dist < hw + 25) return true;

    // Grands boulevards & Grandes places
    if (isNearBoulevard(px, pz, 5.5)) return true;
    for (let i = 0; i < cityPlaces.length; i++) {
      const pl = cityPlaces[i];
      if (Math.hypot(px - pl.x, pz - pl.z) < pl.r + 8) return true;
    }

    // Parcs parisiens & Axe Tuileries / Invalides
    if (isInsideCorridor(px, pz, -800, 120, concorde.x, concorde.z, 150)) return true;
    if (isInsideCorridor(px, pz, -2312, 120, -2390, 1080, 130)) return true;
    if (Math.abs(px - luxPos.x) < 215 && Math.abs(pz - luxPos.z - 20) < 225) return true;
    if (px < -4920) return true;

    // Empreintes des 10 monuments LOD (excluant Saint-Eustache & Tour Eiffel déjà couverts)
    for (let i = 0; i < MONUMENTS.length; i++) {
      const m = MONUMENTS[i];
      if (m.id === 'tour-eiffel' || m.id === 'saint-eustache' || m.id === 'arc-de-triomphe') continue;
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
  const COL_MAX = 23;
  const ROW_MIN = -30;
  const ROW_MAX = 25;
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

      // Forme circulaire globale de Paris intra-muros
      const rx = (x + 1700) / 4400;
      const rz = z / 3200;
      if (rx * rx + rz * rz > 1.05) continue;

      const dBlvd = minBoulevardDistance(x, z);
      const { dist: dSeine } = getSeineDistAndHalfWidth(x, z);
      const nearDiag = dBlvd < 145 || dSeine < 165;

      const rotY = nearDiag ? findNearestUrbanOrientation(x, z, 0) : 0;
      const bw = nearDiag ? 50 + rand() * 6 : 68 + rand() * 6;
      const bd = nearDiag ? 46 + rand() * 5 : 66 + rand() * 6;

      if (!canPlaceBlock(x, z, bw, bd, rotY)) continue;
      occupiedCells.add(`${col},${row}`);

      const cosR = Math.cos(rotY);
      const sinR = Math.sin(rotY);

      const elev = getParisElevation(x, z);
      const yBase = elev - 0.65;
      const montmartreFactor = Math.max(0, Math.min(1, (elev - 28) / 55));
      const hBase = (18.5 + rand() * 5.2) * (1 - montmartreFactor * 0.25) + 0.5;

      const wingD = nearDiag ? 12.8 + rand() * 2.0 : 14.8 + rand() * 2.2;
      const openEast = rand() > 0.78;
      const innerSpan = Math.max(12, bd - wingD * 2);

      const localWings = [
        [0, -(bd - wingD) * 0.5, bw, wingD, 0],
        [0, +(bd - wingD) * 0.5, bw, wingD, 0.5],
        [-(bw - wingD) * 0.5, 0, wingD, innerSpan, -0.4],
      ];
      if (!openEast) {
        localWings.push([+(bw - wingD) * 0.5, 0, wingD, innerSpan, 0.35]);
      }

      const stoneSeed = Math.floor(rand() * 4);
      const roofSeed = Math.floor(rand() * 4);
      for (let wi = 0; wi < localWings.length; wi++) {
        const [lx, lz, ww, wd, dh] = localWings[wi];
        const wx = x + lx * cosR + lz * sinR;
        const wz = z - lx * sinR + lz * cosR;
        wingTransforms.push({
          x: wx,
          y: yBase,
          z: wz,
          w: ww,
          d: wd,
          h: hBase + dh,
          rotY,
          stoneSeed,
          roofSeed,
        });
      }
    }
  }

  /**
   * Réseau de rues secondaires 3D aligné exactement sur la trame STEP = 104 m,
   * fusionné en géométrie statique avec carrefours propres (0 draw call supplémentaire).
   */
  function keepSecondaryRoadSegment(mx, mz) {
    const { dist: dS, hw: hwS } = getSeineDistAndHalfWidth(mx, mz);
    if (dS < hwS + 11) return false;
    if (isNearBoulevard(mx, mz, -5)) return false;

    // Intérieur des quartiers détaillés & parcs (s'arrête net sur les rues bordantes sans trou ni intrusion)
    if (mx > -136 && mx < 134 && mz > -104 && mz < 136) return false;
    if (mx > -68 && mx < 78 && mz >= -138 && mz <= -36) return false;

    const edx = mx - tourEiffelCenter.x;
    const edz = mz - tourEiffelCenter.z;
    const elx = edx * cosEI + edz * sinEI;
    const elz = -edx * sinEI + edz * cosEI;
    if (Math.abs(elx) < 204 && elz > -635 && elz < 880) return false;
    if (Math.hypot(mx - arcCoords.x, mz - arcCoords.z) < 128) return false;

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
      if (m.id === 'tour-eiffel' || m.id === 'saint-eustache' || m.id === 'arc-de-triomphe') continue;
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

    const halfRoad = 6.2;
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
    new THREE.Color(0xf6efe2),
    new THREE.Color(0xede2ce),
    new THREE.Color(0xfaf4e8),
    new THREE.Color(0xe4d7c1),
  ];
  const roofPalette = [
    new THREE.Color(0x7c8d9e),
    new THREE.Color(0x6c7c8d),
    new THREE.Color(0x8899aa),
    new THREE.Color(0x647282),
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
    if (distanceToPolyline(tx, tz, SEINE_POINTS) < 82) return false;
    if (isNearBoulevard(tx, tz, -0.8)) return false;
    if (Math.hypot(tx - invPos.x, tz - invPos.z) < 92) return false;
    for (let i = 0; i < MONUMENTS.length; i++) {
      const m = MONUMENTS[i];
      if (m.id === 'tour-eiffel' || m.id === 'saint-eustache') continue;
      if (Math.hypot(tx - m.pos.x, tz - m.pos.z) < 62) return false;
    }
    return true;
  });

  if (filteredTrees.length > 0) {
    const matCityTrunk = new THREE.MeshStandardMaterial({ color: 0x534030, roughness: 0.92 });
    const matCityLeaf = new THREE.MeshStandardMaterial({ color: 0x527a3f, roughness: 0.85 });
    const cityTrunksInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.24, 0.38, 4.6, 6), matCityTrunk, filteredTrees.length);
    const cityCrownsInst = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(3.0, 1), matCityLeaf, filteredTrees.length);
    cityTrunksInst.castShadow = false;
    cityCrownsInst.castShadow = false;
    cityCrownsInst.receiveShadow = true;

    const leafTint = new THREE.Color();
    filteredTrees.forEach(([tx, tz], idx) => {
      const ty = getParisElevation(tx, tz);
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
