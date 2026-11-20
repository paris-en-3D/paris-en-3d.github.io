import * as THREE from 'three';
import { mergeStaticGroupByMaterial } from '../perf-manager.js';

/**
 * ============================================================================
 * ENVIRONNEMENT PARISIEN HAUTE FIDÉLITÉ — QUARTIER DES HALLES / SAINT-EUSTACHE
 * - Rues réelles : Rue du Jour, Pointe Saint-Eustache, Rue de Turbigo (diagonale),
 *   Rue Rambuteau, Rue Coquillière, Rue Pierre-Lescot (Châtelet – Les Halles)
 * - Îlots Haussmanniens 3D détaillés (balcons filants 3D, corniches, pans coupés,
 *   toits mansardés en zinc avec lucarnes 3D & cheminées à mitrons, brasseries
 *   parisiennes avec auvents et terrasses)
 * - Jardin Nelson-Mandela paysager réaliste (pelouses texturées, allées en granit,
 *   arbres parisiens ramifiés à écorce de platane & feuillage multi-grappes,
 *   bassin miroir, pergolas, bancs Davioud)
 * - Repères parisiens : Sculpture "Écoute" (Henri de Miller), Canopée des Halles,
 *   Bouche de Métro Châtelet–Les Halles, Bourse de Commerce & Colonne Médicis,
 *   Colonnes Morris, Fontaine Wallace, Kiosque parisien et plaques de rue bleues.
 * ============================================================================
 */

// --- TEXTURES PROCÉDURALES URBAINES HAUTE RÉSOLUTION ---

function createAsphaltTexture() {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#383a3f';
  ctx.fillRect(0, 0, size, size);

  // Grain fin d'enrobé parisien + traces légères de roulement
  for (let i = 0; i < 14000; i++) {
    const x = (i * 197 + Math.floor(i / 50) * 13) % size;
    const y = (i * 353 + Math.floor(i / 30) * 29) % size;
    const v = i % 3 === 0 ? 78 : i % 3 === 1 ? 42 : 62;
    ctx.fillStyle = `rgba(${v},${v},${v + 3},0.35)`;
    ctx.fillRect(x, y, 2, 2);
  }
  // Subtiles traces de pneus longitudinales
  ctx.fillStyle = 'rgba(24,25,28,0.18)';
  ctx.fillRect(size * 0.22, 0, size * 0.14, size);
  ctx.fillRect(size * 0.64, 0, size * 0.14, size);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 16);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  return tex;
}

function createSidewalkGraniteTexture() {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  // Dalles de granit gris-beige clair du parvis et des allées Nelson-Mandela
  ctx.fillStyle = '#b9b3a7';
  ctx.fillRect(0, 0, size, size);

  const rows = 8;
  const cols = 4;
  const rh = size / rows;
  const cw = size / cols;
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * (cw * 0.5);
    for (let col = -1; col <= cols; col++) {
      const x = col * cw + off;
      const y = r * rh;
      const d = Math.sin(r * 13.1 + col * 27.3) * 8;
      const v = (186 + d) | 0;
      ctx.fillStyle = `rgb(${v + 2}, ${v}, ${v - 6})`;
      ctx.fillRect(x + 1.5, y + 1.5, cw - 3, rh - 3);
      ctx.strokeStyle = 'rgba(95, 90, 82, 0.32)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, cw, rh);
    }
  }
  for (let i = 0; i < 3600; i++) {
    const x = (i * 163) % size;
    const y = (i * 277 + Math.floor(i / 25) * 9) % size;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,252,245,0.14)' : 'rgba(60,55,48,0.12)';
    ctx.fillRect(x, y, 2, 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(22, 18);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  return tex;
}

function createNaturalGrassTexture() {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  // Vert prairie parisien naturel, jamais fluo
  ctx.fillStyle = '#4e6c3d';
  ctx.fillRect(0, 0, size, size);

  // Larges variations organiques d'humidité / soleil
  for (let i = 0; i < 90; i++) {
    const x = (i * 97) % size;
    const y = (i * 173) % size;
    const r = 24 + (i % 5) * 14;
    const g = ctx.createRadialGradient(x, y, 2, x, y, r);
    g.addColorStop(0, i % 2 === 0 ? 'rgba(104, 134, 72, 0.28)' : 'rgba(54, 78, 42, 0.26)');
    g.addColorStop(1, 'rgba(78, 108, 61, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Brins d'herbe fins
  for (let i = 0; i < 12000; i++) {
    const x = (i * 193 + Math.floor(i / 40) * 7) % size;
    const y = (i * 317) % size;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(132, 156, 86, 0.28)' : 'rgba(42, 62, 32, 0.28)';
    ctx.fillRect(x, y, 1.5, 4);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 8);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  return tex;
}

function createPlaneTreeBarkTexture() {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  // Écorce caractéristique des platanes parisiens (plaques gris-brun, beige et olive)
  ctx.fillStyle = '#6c6254';
  ctx.fillRect(0, 0, size, size);
  const patchColors = ['#8c8270', '#544a3f', '#a69c86', '#615d4a'];
  for (let i = 0; i < 65; i++) {
    ctx.fillStyle = patchColors[i % patchColors.length];
    ctx.beginPath();
    ctx.ellipse((i * 53) % size, (i * 89) % size, 12 + (i % 4) * 5, 22 + (i % 5) * 6, (i % 3) * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createHaussmannTexture({
  stoneHex = '#dfd5c3',
  shopHex = '#4a1c24',
  shopName = 'BRASSERIE DES HALLES',
  seed = 1,
} = {}) {
  const w = 1024;
  const h = 1024;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  // 1. Pierre de taille lutétienne blonde avec refends horizontaux
  ctx.fillStyle = stoneHex;
  ctx.fillRect(0, 0, w, h);

  // Refends en bossage prononcé au rez-de-chaussée et entresol (bas du canvas)
  ctx.strokeStyle = 'rgba(105, 94, 78, 0.34)';
  for (let y = 0; y < h; y += 26) {
    ctx.lineWidth = y > h * 0.68 ? 2.6 : 1.3;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  // Joints verticaux d'appareillage en pierre de taille
  ctx.strokeStyle = 'rgba(115, 104, 88, 0.16)';
  ctx.lineWidth = 1.2;
  for (let r = 0; r < 38; r++) {
    const off = (r % 2) * 44;
    for (let x = off; x < w; x += 88) {
      ctx.beginPath();
      ctx.moveTo(x, r * 26);
      ctx.lineTo(x, (r + 1) * 26);
      ctx.stroke();
    }
  }

  // Patine douce sous les corniches
  const corniceYs = [178, 366, 554, 738];
  corniceYs.forEach((cy) => {
    const g = ctx.createLinearGradient(0, cy, 0, cy + 28);
    g.addColorStop(0, 'rgba(65, 56, 44, 0.25)');
    g.addColorStop(1, 'rgba(65, 56, 44, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, cy, w, 28);
  });

  // 2. Rez-de-chaussée commerçant / brasserie parisienne (y = 758..1024)
  ctx.fillStyle = shopHex;
  ctx.fillRect(0, 758, w, 266);

  // Bandeau d'enseigne doré typique des brasseries des Halles
  ctx.fillStyle = '#1b1817';
  ctx.fillRect(28, 772, w - 56, 42);
  ctx.strokeStyle = '#d4aa58';
  ctx.lineWidth = 3;
  ctx.strokeRect(32, 776, w - 64, 34);
  ctx.fillStyle = '#f2d38a';
  ctx.font = 'bold 22px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(shopName, w * 0.5, 801);

  const cols = 5;
  const colW = w / cols;

  // Vitrines de rez-de-chaussée éclairées chaudement
  for (let col = 0; col < cols; col++) {
    const x0 = col * colW + 18;
    const vw = colW - 36;
    const vg = ctx.createLinearGradient(0, 826, 0, 1008);
    vg.addColorStop(0, '#3a3026');
    vg.addColorStop(0.45, '#b88f56');
    vg.addColorStop(0.85, '#7c5d36');
    vg.addColorStop(1, '#261f19');
    ctx.fillStyle = vg;
    ctx.fillRect(x0, 828, vw, 178);
    ctx.strokeStyle = '#d4b476';
    ctx.lineWidth = 4;
    ctx.strokeRect(x0, 828, vw, 178);
    // Croisillons de vitrine
    ctx.strokeStyle = '#2a221c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x0 + vw * 0.5, 828);
    ctx.lineTo(x0 + vw * 0.5, 1006);
    ctx.moveTo(x0, 882);
    ctx.lineTo(x0 + vw, 882);
    ctx.stroke();
  }

  // 3. 4 étages haussmanniens de hautes fenêtres françaises (entresol + 2e noble + 3e + 4e/5e)
  const floors = [
    { y: 24,  h: 136, noble: true },  // 5e étage (balcon filant)
    { y: 204, h: 142, noble: false }, // 4e étage
    { y: 388, h: 146, noble: false }, // 3e étage
    { y: 572, h: 152, noble: true },  // 2e étage noble (grand balcon filant)
  ];

  floors.forEach((fl, fIdx) => {
    for (let col = 0; col < cols; col++) {
      const cx = col * colW + colW * 0.5;
      const winW = 78;
      const winH = fl.h;

      // Encadrement mouluré en pierre claire + linteau sculpté
      ctx.fillStyle = '#efe8da';
      ctx.fillRect(cx - winW * 0.5 - 10, fl.y - 8, winW + 20, winH + 14);
      ctx.fillStyle = '#c8beaa';
      ctx.fillRect(cx - winW * 0.5 - 14, fl.y - 14, winW + 28, 10);

      // Persiennes parisiennes gris-bleu repliées sur les côtés
      ctx.fillStyle = '#8b949c';
      ctx.fillRect(cx - winW * 0.5 - 22, fl.y, 16, winH);
      ctx.fillRect(cx + winW * 0.5 + 6, fl.y, 16, winH);
      ctx.strokeStyle = 'rgba(40,46,52,0.45)';
      ctx.lineWidth = 1.5;
      for (let sy = fl.y + 8; sy < fl.y + winH; sy += 9) {
        ctx.beginPath();
        ctx.moveTo(cx - winW * 0.5 - 20, sy);
        ctx.lineTo(cx - winW * 0.5 - 8, sy);
        ctx.moveTo(cx + winW * 0.5 + 8, sy);
        ctx.lineTo(cx + winW * 0.5 + 20, sy);
        ctx.stroke();
      }

      // Vitre avec reflet ciel réaliste ou lueur chaude d'appartement (aléatoire)
      const isLit = ((col * 7 + fIdx * 13 + seed * 5) % 7) === 0;
      const wg = ctx.createLinearGradient(cx - winW * 0.5, fl.y, cx + winW * 0.5, fl.y + winH);
      if (isLit) {
        wg.addColorStop(0, '#c89b56');
        wg.addColorStop(0.55, '#8c6634');
        wg.addColorStop(1, '#3b2e22');
      } else {
        wg.addColorStop(0, '#5a738c');
        wg.addColorStop(0.35, '#2b3948');
        wg.addColorStop(0.75, '#1d2630');
        wg.addColorStop(1, '#2f3a45');
      }
      ctx.fillStyle = wg;
      ctx.fillRect(cx - winW * 0.5, fl.y, winW, winH);

      // Voiles / rideaux discrets à l'intérieur
      ctx.fillStyle = 'rgba(240, 234, 220, 0.22)';
      ctx.fillRect(cx - winW * 0.5 + 2, fl.y + 2, 16, winH - 4);
      ctx.fillRect(cx + winW * 0.5 - 18, fl.y + 2, 16, winH - 4);

      // Menuiserie blanche fine des fenêtres françaises
      ctx.strokeStyle = '#e8e2d6';
      ctx.lineWidth = 3.2;
      ctx.strokeRect(cx - winW * 0.5 + 1.5, fl.y + 1.5, winW - 3, winH - 3);
      ctx.beginPath();
      ctx.moveTo(cx, fl.y);
      ctx.lineTo(cx, fl.y + winH);
      ctx.moveTo(cx - winW * 0.5, fl.y + winH * 0.34);
      ctx.lineTo(cx + winW * 0.5, fl.y + winH * 0.34);
      ctx.moveTo(cx - winW * 0.5, fl.y + winH * 0.67);
      ctx.lineTo(cx + winW * 0.5, fl.y + winH * 0.67);
      ctx.stroke();

      // Garde-corps individuel en fer forgé noir
      ctx.strokeStyle = '#1b1d20';
      ctx.lineWidth = 2.6;
      ctx.strokeRect(cx - winW * 0.5 - 2, fl.y + winH - 40, winW + 4, 40);
      for (let gx = cx - winW * 0.5 + 8; gx < cx + winW * 0.5; gx += 12) {
        ctx.beginPath();
        ctx.moveTo(gx, fl.y + winH - 40);
        ctx.lineTo(gx, fl.y + winH);
        ctx.stroke();
      }
    }
  });

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 12;
  return tex;
}

function createStreetSignTexture(line1, line2 = '1er ARRt') {
  const w = 256;
  const h = 140;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  // Plaque émaillée bleue emblématique de la Ville de Paris
  ctx.fillStyle = '#143c7a';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#1d6f42';
  ctx.lineWidth = 10;
  ctx.strokeRect(6, 6, w - 12, h - 12);
  ctx.strokeStyle = '#f2f0ea';
  ctx.lineWidth = 3;
  ctx.strokeRect(14, 14, w - 28, h - 28);

  ctx.fillStyle = '#f8f6f0';
  ctx.font = 'bold 20px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(line2, w * 0.5, 44);
  ctx.font = 'bold 25px Georgia, serif';
  ctx.fillText(line1, w * 0.5, 92);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createMorrisPosterTexture() {
  const w = 256;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  const cols = ['#c4362e', '#26538d', '#d99e32', '#2b6b4f'];
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = cols[i];
    ctx.fillRect(i * 64 + 3, 12, 58, 232);
    ctx.fillStyle = '#f5eedc';
    ctx.fillRect(i * 64 + 8, 28, 48, 84);
    ctx.fillStyle = '#1e1b18';
    ctx.fillRect(i * 64 + 12, 134, 40, 10);
    ctx.fillRect(i * 64 + 12, 152, 32, 8);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * ============================================================================
 * CONSTRUCTION COMPLÈTE DU QUARTIER PARISIEN AUTOUR DE SAINT-EUSTACHE
 * ============================================================================
 */
export function buildParisEnvironment(
  root,
  {
    matStoneExt,
    matStoneFacade,
    matStoneTrim,
    matLead,
    matWoodOrgan,
    matGold,
    colliders,
    circleColliders,
    streetLampEmissives,
  }
) {
  const envGroup = new THREE.Group();
  envGroup.name = 'QuartierDesHallesParis';
  root.add(envGroup);

  const microPropsGroup = new THREE.Group();
  microPropsGroup.name = 'SaintEustacheMicroProps';
  microPropsGroup.userData.keepGroup = true;
  envGroup.add(microPropsGroup);
  envGroup.userData.microPropsGroup = microPropsGroup;

  function addBox(w, h, d, x, y, z, mat, { cast = true, receive = true, collide = false, parent = envGroup } = {}) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    parent.add(mesh);
    if (collide) {
      colliders.push({
        minX: x - w * 0.5,
        maxX: x + w * 0.5,
        minZ: z - d * 0.5,
        maxZ: z + d * 0.5,
      });
    }
    return mesh;
  }

  function addCylinder(rt, rb, h, seg, x, y, z, mat, { cast = true, receive = true, parent = envGroup } = {}) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    parent.add(mesh);
    return mesh;
  }

  // --- MATÉRIAUX URBAINS ---
  const texAsphalt = createAsphaltTexture();
  const texSidewalk = createSidewalkGraniteTexture();
  const texGrass = createNaturalGrassTexture();
  const texBark = createPlaneTreeBarkTexture();

  const matAsphalt = new THREE.MeshStandardMaterial({ map: texAsphalt, roughness: 0.92, metalness: 0.04 });
  const matSidewalk = new THREE.MeshStandardMaterial({ map: texSidewalk, roughness: 0.86, metalness: 0.04 });
  const matKerb = new THREE.MeshStandardMaterial({ color: 0xbcb5a8, roughness: 0.84 });
  const matRoadMark = new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.85 });
  const matLawn = new THREE.MeshStandardMaterial({ map: texGrass, roughness: 0.94 });
  const matHedge = new THREE.MeshStandardMaterial({ color: 0x35512a, roughness: 0.9 });
  const matBark = new THREE.MeshStandardMaterial({ map: texBark, roughness: 0.92 });
  const matLeafDark = new THREE.MeshStandardMaterial({ color: 0x3c592f, roughness: 0.85 });
  const matLeafMid = new THREE.MeshStandardMaterial({ color: 0x52713c, roughness: 0.84 });
  const matLeafLight = new THREE.MeshStandardMaterial({ color: 0x6c8848, roughness: 0.82 });
  const matLeafAutumn = new THREE.MeshStandardMaterial({ color: 0x8b8644, roughness: 0.84 });
  const matIron = new THREE.MeshStandardMaterial({ color: 0x1e2423, roughness: 0.44, metalness: 0.74 });
  const matParisGreen = new THREE.MeshStandardMaterial({ color: 0x1e4a38, roughness: 0.42, metalness: 0.56 });
  const matZincRoof = new THREE.MeshStandardMaterial({ color: 0x5f6b78, roughness: 0.48, metalness: 0.52 });
  const matTerracotta = new THREE.MeshStandardMaterial({ color: 0xa65e40, roughness: 0.82 });
  const matWater = new THREE.MeshStandardMaterial({
    color: 0x2a5166,
    roughness: 0.1,
    metalness: 0.68,
    transparent: true,
    opacity: 0.88,
  });
  const matCanopeeGold = new THREE.MeshStandardMaterial({
    color: 0xe6d394,
    emissive: new THREE.Color(0x524018),
    emissiveIntensity: 0.22,
    roughness: 0.24,
    metalness: 0.35,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  });
  const matGlassModern = new THREE.MeshStandardMaterial({
    color: 0x7fa4bc,
    roughness: 0.14,
    metalness: 0.68,
    transparent: true,
    opacity: 0.64,
  });

  /**
   * ==========================================================================
   * 1. RUES PARISIENNES RÉELLES (PLAN 2D VÉRIFIÉ — ZÉRO CHEVAUCHEMENT)
   * - Rue du Jour / Rue Montmartre : axe x = -74 (Nord-Sud)
   * - Rue Coquillière (Ouest) & Rue Rambuteau (Est) : axe z = -36 (Est-Ouest)
   * - Carrefour Pointe Saint-Eustache : (-74, -36)
   * - Rue de Turbigo : diagonale partant de (-74, -36) vers le Nord-Est (+X, -Z)
   * - Rue Pierre-Lescot : axe x = +72 (Nord-Sud, côté Châtelet / Beaubourg)
   * - Rue Berger : axe z = +112 (Est-Ouest, limite Sud du Jardin Nelson-Mandela)
   * ==========================================================================
   */
  function addStreetRoad(len, width, cx, cz, rotY = 0, { withKerbs = true } = {}) {
    const g = new THREE.Group();
    g.position.set(cx, 0.025, cz);
    g.rotation.y = rotY;
    const road = new THREE.Mesh(new THREE.BoxGeometry(width, 0.05, len), matAsphalt);
    road.receiveShadow = true;
    g.add(road);
    if (withKerbs) {
      [-width * 0.5 - 0.18, width * 0.5 + 0.18].forEach((kx) => {
        const kerb = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, len), matKerb);
        kerb.position.set(kx, 0.06, 0);
        kerb.receiveShadow = true;
        g.add(kerb);
      });
    }
    for (let d = -len * 0.46; d < len * 0.46; d += 8.0) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.015, 3.0), matRoadMark);
      dash.position.set(0, 0.032, d);
      g.add(dash);
    }
    envGroup.add(g);
  }

  // Socle pavé continu calé au ras des îlots bâtis des Halles (sans marge vide autour)
  addBox(272, 0.06, 254, -2, -0.04, 17, matSidewalk, { cast: false, receive: true });
  addBox(92, 0.06, 62, 36, -0.04, -124, matSidewalk, { cast: false, receive: true });

  // Chaussées principales propres avec carrefours bouclés (zéro cul-de-sac)
  addStreetRoad(282, 11.2, 1, -36, Math.PI * 0.5, { withKerbs: false });  // Rue Coquillière (Ouest) + Rue Rambuteau (Est) : x ∈ [-140, +142]
  addStreetRoad(252, 11.4, -74, 16, 0, { withKerbs: false });             // Rue Montmartre (Nord) + Rue du Jour (Sud) : z ∈ [-110, +142]
  addStreetRoad(280, 11.2, 72, 2, 0, { withKerbs: false });               // Rue Pierre-Lescot / Saint-Denis : z ∈ [-138, +142] (rejoint Turbigo !)
  addStreetRoad(282, 11.2, 1, 112, Math.PI * 0.5, { withKerbs: false });  // Rue Berger (Sud du Jardin Nelson-Mandela) : x ∈ [-140, +142]
  addStreetRoad(252, 12.0, -140, 16, 0, { withKerbs: false });            // Rue du Louvre (bouclage Ouest Bourse de Commerce) : z ∈ [-110, +142]

  // Rue de Turbigo : démarre EXACTEMENT au carrefour Pointe Saint-Eustache (-74, -36) vers le Nord-Est (angle 35°, largeur 13 m)
  const turbigoLen = 196;
  const turbigoAngle = Math.atan2(0.70, 1.0); // ~35° : dx = +cos, dz = -sin
  const turbigoCx = -74 + Math.cos(turbigoAngle) * (turbigoLen * 0.5);
  const turbigoCz = -36 - Math.sin(turbigoAngle) * (turbigoLen * 0.5);
  // Dans Three.js, un axe local +Z tourné par rotY = Math.PI/2 + turbigoAngle pointe vers (+cos, -sin) !
  addStreetRoad(turbigoLen, 13.0, turbigoCx, turbigoCz, Math.PI * 0.5 + turbigoAngle, { withKerbs: false });

  // Carrefours asphaltés propres (évite les pointillés dans les intersections)
  [[-74, -36], [72, -36], [72, -138], [-74, 112], [72, 112], [-140, -36], [-140, 112]].forEach(([ix, iz]) => {
    addBox(12.6, 0.06, 12.6, ix, 0.03, iz, matAsphalt, { cast: false, receive: true });
  });

  // Passages piétons parisiens exactement aux bords des carrefours
  function addCrosswalk(cx, cz, rotY = 0) {
    const g = new THREE.Group();
    g.position.set(cx, 0.062, cz);
    g.rotation.y = rotY;
    for (let s = -3; s <= 3; s++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.012, 0.52), matRoadMark);
      bar.position.z = s * 1.18;
      g.add(bar);
    }
    envGroup.add(g);
  }
  addCrosswalk(-74, -26, Math.PI * 0.5);
  addCrosswalk(-74, 24, Math.PI * 0.5);
  addCrosswalk(-64, -36, 0);
  addCrosswalk(4, -36, 0);
  addCrosswalk(62, -36, 0);
  addCrosswalk(72, -26, Math.PI * 0.5);
  addCrosswalk(72, 42, Math.PI * 0.5);
  addCrosswalk(-64, 112, 0);
  addCrosswalk(62, 112, 0);

  // Trottoirs en granit clair strictement hors chaussées
  addBox(134, 0.14, 6.2, -1, 0.07, -27.2, matSidewalk, { cast: false, receive: true });  // Trottoir Sud de Rambuteau (côté église)
  addBox(88,  0.14, 6.2, 18, 0.07, -44.8, matSidewalk, { cast: false, receive: true });  // Trottoir Nord de Rambuteau (sous îlot)
  addBox(6.2, 0.14, 134, -82.8, 0.07, 38, matSidewalk, { cast: false, receive: true });  // Trottoir Ouest Rue du Jour
  addBox(6.2, 0.14, 134, 80.8,  0.07, 38, matSidewalk, { cast: false, receive: true });  // Trottoir Est Rue Pierre-Lescot
  addBox(134, 0.14, 6.2, -1, 0.07, 120.8, matSidewalk, { cast: false, receive: true });  // Trottoir Sud Rue Berger

  /**
   * ==========================================================================
   * 2. ARCHITECTURE HAUSSMANNIENNE PARISIENNE 3D RÉALISTE
   * - Relief 3D complet : balcons filants au 2e & 5e étages avec consoles & fer forgé,
   *   corniches en pierre, toits mansardés brisés en zinc avec vraies lucarnes 3D
   *   et souches de cheminées à mitrons en terre cuite, auvents de brasseries 3D
   *   et terrasses de cafés parisiennes !
   * ==========================================================================
   */
  const haussSpecs = [
    { stoneHex: '#e2d7c3', shopHex: '#5c1a24', shopName: 'AU PIED DE COCHON', awning: 0x731d28 },
    { stoneHex: '#dcd0bb', shopHex: '#1c3f30', shopName: 'BRASSERIE SAINT-EUSTACHE', awning: 0x1e4d39 },
    { stoneHex: '#e6dcc9', shopHex: '#1f2c42', shopName: 'CAFÉ DE TURBIGO', awning: 0x203554 },
    { stoneHex: '#d8ccb6', shopHex: '#4f2c1f', shopName: 'BOULANGERIE DES HALLES', awning: 0x6b3a24 },
  ];

  const haussMaterials = haussSpecs.map((spec, idx) =>
    new THREE.MeshStandardMaterial({
      map: createHaussmannTexture({ ...spec, seed: idx + 1 }),
      roughness: 0.82,
      metalness: 0.03,
    })
  );
  const haussAwningMaterials = haussSpecs.map(
    (spec) => new THREE.MeshStandardMaterial({ color: spec.awning, roughness: 0.78 })
  );

  function addRealisticHaussmannBuilding({
    x,
    z,
    w,
    d,
    h = 20.5,
    rotY = 0,
    styleIdx = 0,
    streetFace = 'front', // 'front' (+Z), 'back' (-Z), 'both', 'all'
    withTerrace = false,
    streetSign = null,
    cornerBevel = false,
  }) {
    const g = new THREE.Group();
    g.position.set(x, 0.08, z);
    g.rotation.y = rotY;

    const facadeMat = haussMaterials[styleIdx % haussMaterials.length];
    const awningMat = haussAwningMaterials[styleIdx % haussAwningMaterials.length];

    // Corps principal en pierre de taille
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), facadeMat);
    body.position.y = h * 0.5;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);

    // Chaînes d'angle verticales en pierre claire (séparation réaliste entre immeubles mitoyens)
    [[-w * 0.5, -d * 0.5], [w * 0.5, -d * 0.5], [-w * 0.5, d * 0.5], [w * 0.5, d * 0.5]].forEach(([cx, cz]) => {
      addBox(0.55, h, 0.55, cx, h * 0.5, cz, matStoneTrim, { cast: false, parent: g });
    });

    // Pan coupé / rotonde d'angle typiquement haussmannienne aux grands carrefours
    if (cornerBevel) {
      addCylinder(2.6, 2.7, h, 12, -w * 0.5 + 0.4, h * 0.5, d * 0.5 - 0.4, matStoneFacade, { parent: g });
      const cornerCupola = new THREE.Mesh(
        new THREE.SphereGeometry(2.75, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
        matZincRoof
      );
      cornerCupola.position.set(-w * 0.5 + 0.4, h + 0.4, d * 0.5 - 0.4);
      g.add(cornerCupola);
      addCylinder(0.12, 0.2, 1.8, 8, -w * 0.5 + 0.4, h + 3.6, d * 0.5 - 0.4, matGold, { parent: g });
    }

    // Corniches 3D moulurées (au-dessus du RDC, 2e étage, 5e étage & couronnement)
    [5.2, 8.6, 17.6, h].forEach((cy, idx) => {
      const overhang = idx === 3 ? 0.75 : idx === 1 || idx === 2 ? 0.45 : 0.25;
      addBox(w + overhang, idx === 3 ? 0.62 : 0.32, d + overhang, 0, cy, 0, matStoneTrim, { cast: true, parent: g });
    });

    const microSub = (withTerrace || streetSign) ? new THREE.Group() : null;
    if (microSub) {
      microSub.position.copy(g.position);
      microSub.rotation.copy(g.rotation);
      microPropsGroup.add(microSub);
    }

    // Vrais balcons filants 3D (2e et 5e étages) + auvents de brasserie sur les faces sur rue
    const faces = [];
    if (streetFace === 'front' || streetFace === 'both' || streetFace === 'all') faces.push({ side: 1, axis: 'z' });
    if (streetFace === 'back' || streetFace === 'both' || streetFace === 'all') faces.push({ side: -1, axis: 'z' });
    if (streetFace === 'all') {
      faces.push({ side: 1, axis: 'x' }, { side: -1, axis: 'x' });
    }

    faces.forEach(({ side, axis }) => {
      const span = axis === 'z' ? w - 0.8 : d - 0.8;
      const offset = (axis === 'z' ? d : w) * 0.5;

      // Balcons filants 3D au 2e étage (y = 8.75) et 5e étage (y = 17.75)
      [8.75, 17.75].forEach((by) => {
        const slab = new THREE.Mesh(
          new THREE.BoxGeometry(axis === 'z' ? span : 0.95, 0.22, axis === 'z' ? 0.95 : span),
          matStoneTrim
        );
        slab.position.set(axis === 'x' ? side * (offset + 0.45) : 0, by, axis === 'z' ? side * (offset + 0.45) : 0);
        slab.castShadow = true;
        g.add(slab);

        // Garde-corps en fer forgé noir 3D
        const rail = new THREE.Mesh(
          new THREE.BoxGeometry(axis === 'z' ? span : 0.08, 0.92, axis === 'z' ? 0.08 : span),
          matIron
        );
        rail.position.set(axis === 'x' ? side * (offset + 0.88) : 0, by + 0.55, axis === 'z' ? side * (offset + 0.88) : 0);
        g.add(rail);
      });

      // Auvent de brasserie parisienne incliné en 3D au rez-de-chaussée
      const awning = new THREE.Mesh(
        new THREE.BoxGeometry(axis === 'z' ? span * 0.88 : 1.9, 0.14, axis === 'z' ? 1.9 : span * 0.88),
        awningMat
      );
      awning.position.set(axis === 'x' ? side * (offset + 0.9) : 0, 3.85, axis === 'z' ? side * (offset + 0.9) : 0);
      if (axis === 'z') awning.rotation.x = side * 0.26;
      else awning.rotation.z = -side * 0.26;
      awning.castShadow = true;
      g.add(awning);

      // Terrasse de café parisien (tables rondes bistro + chaises) devant les brasseries clés
      if (withTerrace && axis === 'z' && side === 1) {
        for (let tx = -w * 0.36; tx <= w * 0.36; tx += 3.2) {
          addCylinder(0.42, 0.42, 0.06, 12, tx, 0.78, offset + 2.1, matStoneTrim, { cast: false, parent: microSub });
          addCylinder(0.05, 0.08, 0.76, 8, tx, 0.38, offset + 2.1, matIron, { cast: false, parent: microSub });
          [-0.65, 0.65].forEach((cx) => {
            addBox(0.38, 0.46, 0.38, tx + cx, 0.23, offset + 2.1, awningMat, { cast: false, parent: microSub });
          });
        }
      }
    });

    // Plaque de rue bleue émaillée de Paris sur l'angle de l'immeuble
    if (streetSign) {
      const signMat = new THREE.MeshStandardMaterial({ map: createStreetSignTexture(streetSign), roughness: 0.32 });
      addBox(1.5, 0.82, 0.08, -w * 0.36, 4.75, d * 0.5 + 0.06, signMat, { cast: false, parent: microSub });
    }

    // --- TOIT MANSARDÉ BRISÉ À LA MANSART EN ZINC GRIS-BLEU + LUCARNES 3D + CHEMINÉES À MITRONS ---
    const mansardH = 3.8;
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-d * 0.5, 0);
    roofShape.lineTo(d * 0.5, 0);
    roofShape.lineTo(d * 0.38, mansardH);
    roofShape.lineTo(-d * 0.38, mansardH);
    roofShape.closePath();
    const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: w - 0.2, bevelEnabled: false });
    roofGeo.rotateY(Math.PI * 0.5);
    roofGeo.translate(-(w - 0.2) * 0.5, 0, 0);
    const roofMesh = new THREE.Mesh(roofGeo, matZincRoof);
    roofMesh.position.y = h + 0.28;
    roofMesh.castShadow = true;
    roofMesh.receiveShadow = true;
    g.add(roofMesh);

    // Lucarnes 3D (chiens-assis en zinc & vitre) alignées avec les travées sur rue
    const dormerCount = Math.max(3, Math.floor(w / 5.2));
    for (let i = 0; i < dormerCount; i++) {
      const dx = -w * 0.4 + (i / Math.max(1, dormerCount - 1)) * (w * 0.8);
      if (streetFace === 'front' || streetFace === 'both' || streetFace === 'all') {
        addBox(1.45, 2.1, 1.3, dx, h + 1.65, d * 0.44, matZincRoof, { parent: g });
        addBox(0.95, 1.35, 0.12, dx, h + 1.58, d * 0.5 + 0.08, matGlassModern, { cast: false, parent: g });
      }
      if (streetFace === 'back' || streetFace === 'both' || streetFace === 'all') {
        addBox(1.45, 2.1, 1.3, dx, h + 1.65, -d * 0.44, matZincRoof, { parent: g });
      }
    }

    // Souches de cheminées parisiennes en pierre coiffées de rangées de mitrons en terre cuite !
    [-w * 0.3, 0, w * 0.3].forEach((cx) => {
      addBox(2.2, 2.0, 0.85, cx, h + mansardH + 1.0, 0, matStoneExt, { cast: false, parent: g });
      for (let m = -0.7; m <= 0.7; m += 0.46) {
        addCylinder(0.11, 0.14, 0.72, 6, cx + m, h + mansardH + 2.35, 0, matTerracotta, { cast: false, parent: g });
      }
    });

    envGroup.add(g);
  }

  // --- ÎLOTS HAUSSMANNIENS STRICTEMENT ALIGNÉS SUR LE VRAI PLAN DES RUES (ZÉRO COLLISION) ---

  // 1. Îlot triangulaire entre Rue Rambuteau (Sud, z = -36) et Rue de Turbigo (diagonale Nord-Est)
  // Démarre à x = -24 pour laisser la place triangulaire de la Pointe Saint-Eustache libre devant la bifurcation !
  addRealisticHaussmannBuilding({ x: -12, z: -55, w: 24, d: 14, h: 21.0, styleIdx: 0, streetFace: 'both', withTerrace: true, streetSign: 'RUE RAMBUTEAU', cornerBevel: true });
  addRealisticHaussmannBuilding({ x: 14,  z: -55, w: 26, d: 14, h: 22.0, styleIdx: 1, streetFace: 'both', withTerrace: true });
  addRealisticHaussmannBuilding({ x: 42,  z: -55, w: 28, d: 14, h: 20.8, styleIdx: 2, streetFace: 'both', withTerrace: true, cornerBevel: true });
  // Second rang à l'intérieur du triangle Rambuteau / Turbigo (côté Est là où le triangle s'élargit)
  addRealisticHaussmannBuilding({ x: 38,  z: -77, w: 32, d: 15, h: 21.6, styleIdx: 3, streetFace: 'both' });

  // Prolongement Est de la Rue Rambuteau (au-delà du carrefour Rue Pierre-Lescot x = +72)
  addRealisticHaussmannBuilding({ x: 96,  z: -55, w: 24, d: 14, h: 21.5, styleIdx: 0, streetFace: 'front', withTerrace: true, cornerBevel: true });
  addRealisticHaussmannBuilding({ x: 124, z: -55, w: 28, d: 14, h: 22.0, styleIdx: 1, streetFace: 'front' });

  // 2. Rangée Nord-Ouest longeant EXACTEMENT la diagonale de la Rue de Turbigo (tournée face à la rue !)
  [44, 74, 104, 134, 164].forEach((s, idx) => {
    const px = -74 + s * Math.cos(turbigoAngle);
    const pz = -36 - s * Math.sin(turbigoAngle);
    // Décalage perpendiculaire de 15.5m côté Nord-Ouest de l'axe Turbigo
    const bx = px - Math.sin(turbigoAngle) * 15.5;
    const bz = pz - Math.cos(turbigoAngle) * 15.5;
    addRealisticHaussmannBuilding({
      x: bx,
      z: bz,
      w: 28,
      d: 14,
      h: 21.2 + (idx % 3) * 0.7,
      rotY: turbigoAngle,
      styleIdx: (idx + 2) % 4,
      streetFace: 'front',
      withTerrace: idx < 2,
      streetSign: idx === 0 ? 'RUE DE TURBIGO' : null,
    });
  });

  // 3. Rangée Ouest le long de la Rue du Jour / Rue Montmartre (x = -95, strictement à l'Ouest de x = -80)
  // Au Nord de la Rue Coquillière (z < -42)
  addRealisticHaussmannBuilding({ x: -95, z: -60, w: 26, d: 16, h: 21.8, rotY: Math.PI * 0.5, styleIdx: 1, streetFace: 'front', withTerrace: true, streetSign: 'RUE MONTMARTRE', cornerBevel: true });
  addRealisticHaussmannBuilding({ x: -95, z: -88, w: 28, d: 16, h: 22.2, rotY: Math.PI * 0.5, styleIdx: 2, streetFace: 'front' });
  // Face à la Façade Occidentale de Saint-Eustache (au Sud de Coquillière, z ∈ [-27, +20])
  addRealisticHaussmannBuilding({ x: -95, z: -14, w: 25, d: 16, h: 21.6, rotY: Math.PI * 0.5, styleIdx: 0, streetFace: 'front', withTerrace: true, streetSign: 'RUE DU JOUR', cornerBevel: true });
  addRealisticHaussmannBuilding({ x: -95, z: 10,  w: 21, d: 16, h: 20.8, rotY: Math.PI * 0.5, styleIdx: 3, streetFace: 'front', withTerrace: true, streetSign: 'RUE COQUILLIÈRE' });
  // (Ouverture urbaine z ∈ [+22, +66] révélant la Bourse de Commerce depuis le Jardin Nelson-Mandela !)
  addRealisticHaussmannBuilding({ x: -95, z: 85,  w: 32, d: 16, h: 21.5, rotY: Math.PI * 0.5, styleIdx: 2, streetFace: 'front' });

  // 4. Rangée Est le long de la Rue Pierre-Lescot (x = +94, strictement à l'Est de x = +78)
  addRealisticHaussmannBuilding({ x: 94, z: -15, w: 26, d: 16, h: 21.8, rotY: -Math.PI * 0.5, styleIdx: 2, streetFace: 'front', withTerrace: true, streetSign: 'RUE PIERRE-LESCOT', cornerBevel: true });
  addRealisticHaussmannBuilding({ x: 94, z: 14,  w: 30, d: 16, h: 21.2, rotY: -Math.PI * 0.5, styleIdx: 0, streetFace: 'front', withTerrace: true });
  addRealisticHaussmannBuilding({ x: 94, z: 46,  w: 32, d: 16, h: 22.4, rotY: -Math.PI * 0.5, styleIdx: 1, streetFace: 'front' });
  addRealisticHaussmannBuilding({ x: 94, z: 82,  w: 36, d: 16, h: 21.6, rotY: -Math.PI * 0.5, styleIdx: 3, streetFace: 'front' });

  // 5. Rangée Sud le long de la Rue Berger (z = +132, strictement au Sud de z = +118)
  addRealisticHaussmannBuilding({ x: -95, z: 132, w: 28, d: 16, h: 21.6, rotY: Math.PI, styleIdx: 1, streetFace: 'front' });
  addRealisticHaussmannBuilding({ x: -48, z: 132, w: 34, d: 16, h: 22.0, rotY: Math.PI, styleIdx: 0, streetFace: 'front', streetSign: 'RUE BERGER' });
  addRealisticHaussmannBuilding({ x: -10, z: 132, w: 38, d: 16, h: 23.0, rotY: Math.PI, styleIdx: 1, streetFace: 'front' });
  addRealisticHaussmannBuilding({ x: 32,  z: 132, w: 40, d: 16, h: 22.2, rotY: Math.PI, styleIdx: 2, streetFace: 'front' });
  addRealisticHaussmannBuilding({ x: 94,  z: 132, w: 32, d: 16, h: 21.8, rotY: Math.PI, styleIdx: 3, streetFace: 'front' });

  /**
   * ==========================================================================
   * 3. JARDIN NELSON-MANDELA PAYSAGER RÉALISTE (Sud : z = +31 .. +106)
   * ==========================================================================
   */
  // Grandes promenades en dalles de granit clair (esplanade Nelson-Mandela)
  addBox(128, 0.06, 74, -2, 0.03, 68, matSidewalk, { cast: false, receive: true });

  // Grandes pelouses paysagères naturelles bordées de murets-assises en pierre de Bourgogne
  const gardenLawns = [
    { x: -34, z: 49, w: 34, d: 21 },
    { x: -10, z: 49, w: 11, d: 21 },
    { x: 24,  z: 49, w: 25, d: 21 },
    { x: -32, z: 80, w: 40, d: 25 },
    { x: -2,  z: 82, w: 15, d: 21 },
  ];
  gardenLawns.forEach((lw) => {
    // Muret-assise bas en pierre claire + pelouse texturée naturelle
    addBox(lw.w + 1.0, 0.36, lw.d + 1.0, lw.x, 0.22, lw.z, matStoneTrim, { cast: true, receive: true });
    addBox(lw.w, 0.34, lw.d, lw.x, 0.25, lw.z, matLawn, { cast: false, receive: true });
    // Massifs de haies basses et buissons taillés sur les bordures
    addBox(lw.w - 2.0, 0.58, 0.85, lw.x, 0.68, lw.z - lw.d * 0.5 + 0.75, matHedge, { cast: true });
  });

  // Parterres fleuris naturels (graminées dorées, lavandes, rosiers) le long de l'allée centrale
  const flowerTones = [0x9f76b8, 0xc97b84, 0xd9ba6c, 0xebe4d4, 0x6f8c54];
  const flowerMats = flowerTones.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }));
  for (let i = 0; i < 20; i++) {
    const fMat = flowerMats[i % flowerMats.length];
    const fz = 38 + (i % 10) * 5.6;
    const fx = i < 10 ? -2.4 : 10.4;
    const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55 + (i % 3) * 0.12, 1), fMat);
    bush.scale.set(1.2, 0.55, 1.8);
    bush.position.set(fx, 0.56, fz);
    microPropsGroup.add(bush);
  }

  // Bassin miroir au cœur de l'allée axiale du Jardin Nelson-Mandela (x = 4, z = 63)
  addBox(7.4, 0.44, 13.0, 4, 0.26, 63, matStoneTrim, { cast: true, receive: true });
  addBox(6.3, 0.16, 11.8, 4, 0.44, 63, matWater, { cast: false, receive: true });

  // Pergolas / treilles architecturales vert-gris du jardin Nelson-Mandela (côté Ouest)
  for (let pz = 40; pz <= 88; pz += 9.6) {
    addBox(0.18, 3.7, 0.18, -54, 1.9, pz, matParisGreen);
    addBox(0.18, 3.7, 0.18, -59.5, 1.9, pz, matParisGreen);
    addBox(5.8, 0.16, 0.18, -56.75, 3.75, pz, matParisGreen);
  }
  addBox(0.16, 0.16, 50, -54, 3.75, 64, matParisGreen);
  addBox(0.16, 0.16, 50, -59.5, 3.75, 64, matParisGreen);

  // --- ARBRES PARISIENS RÉALISTES (Platanes & Marronniers à troncs ramifiés et feuillage multi-grappes) ---
  const foliageGeoSmall = new THREE.IcosahedronGeometry(1.0, 1);
  const foliageMats = [matLeafDark, matLeafMid, matLeafLight, matLeafAutumn];

  function addRealisticParisianTree(tx, tz, scale = 1.0, seed = 0) {
    const t = new THREE.Group();
    t.position.set(tx, 0.04, tz);

    // Grille d'arbre parisienne en fonte au pied du tronc
    const grate = new THREE.Mesh(new THREE.CylinderGeometry(1.05 * scale, 1.08 * scale, 0.06, 8), matIron);
    grate.position.y = 0.03;
    t.add(grate);

    // Tronc principal légèrement effilé avec écorce de platane
    const trunkH = 4.6 * scale;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.42 * scale, trunkH, 9), matBark);
    trunk.position.y = trunkH * 0.5;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    t.add(trunk);

    // 5 branches maîtresses divergeant naturellement
    const branchCount = 5;
    for (let b = 0; b < branchCount; b++) {
      const a = seed * 1.1 + (b / branchCount) * Math.PI * 2;
      const tilt = 0.42 + (b % 2) * 0.18;
      const bLen = (2.6 + (b % 3) * 0.5) * scale;
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * scale, 0.14 * scale, bLen, 6), matBark);
      const bx = Math.cos(a) * Math.sin(tilt) * bLen * 0.45;
      const bz = Math.sin(a) * Math.sin(tilt) * bLen * 0.45;
      const by = trunkH * 0.84 + Math.cos(tilt) * bLen * 0.42;
      br.position.set(bx, by, bz);
      br.rotation.set(Math.sin(a) * tilt, 0, -Math.cos(a) * tilt);
      br.castShadow = true;
      t.add(br);

      // Grappes aériennes de feuillage organique au bout de chaque branche (silhouette dentelée réaliste)
      for (let k = 0; k < 3; k++) {
        const ka = a + (k - 1) * 0.55;
        const kr = (1.15 + ((b + k + seed) % 3) * 0.28) * scale;
        const leafCluster = new THREE.Mesh(foliageGeoSmall, foliageMats[(seed + b + k) % foliageMats.length]);
        leafCluster.scale.set(kr * 1.18, kr * 0.82, kr * 1.08);
        leafCluster.position.set(
          Math.cos(ka) * (1.55 + k * 0.42) * scale,
          (5.6 + k * 0.65 + (b % 2) * 0.55) * scale,
          Math.sin(ka) * (1.55 + k * 0.42) * scale
        );
        leafCluster.rotation.set(k * 0.7, ka, b * 0.5);
        leafCluster.castShadow = true;
        leafCluster.receiveShadow = true;
        t.add(leafCluster);
      }
    }

    // Sommet de la couronne (2 grappes hautes lumineuses)
    const crownTop = new THREE.Mesh(foliageGeoSmall, foliageMats[(seed + 2) % 3]);
    crownTop.scale.set(1.9 * scale, 1.35 * scale, 1.75 * scale);
    crownTop.position.set(0.2 * scale, 7.6 * scale, -0.15 * scale);
    crownTop.castShadow = true;
    crownTop.receiveShadow = true;
    t.add(crownTop);

    envGroup.add(t);
    circleColliders.push({ x: tx, z: tz, r: 0.75 * scale });
  }

  const treeCoords = [
    // Alignement Nord du Jardin Nelson-Mandela (face au Transept Sud)
    [-46, 40, 1.15], [-34, 40, 1.2], [-22, 40, 1.1], [-10, 41, 1.15],
    [14, 41, 1.15],  [28, 41, 1.2],  [40, 41, 1.1],  [52, 42, 1.15],
    // Cœur & promenades du Jardin Nelson-Mandela
    [-46, 57, 1.2],  [-30, 57, 1.25], [-14, 58, 1.12], [16, 57, 1.18], [34, 57, 1.15],
    [-44, 74, 1.25], [-24, 76, 1.18], [-12, 86, 1.15], [6, 88, 1.2],   [-34, 93, 1.22],
    // Platanes d'alignement des rues parisiennes (Rue du Jour, Rue Rambuteau, Rue Pierre-Lescot)
    [-64, -22, 1.05], [-64, 24, 1.12], [-48, -28, 1.02],
    [-22, -28, 1.05], [18, -28, 1.08], [58, -24, 1.12], [60, 22, 1.08],
  ];
  treeCoords.forEach(([tx, tz, sc], idx) => addRealisticParisianTree(tx, tz, sc, idx));

  /**
   * ==========================================================================
   * 4. REPÈRES EMBLÉMATIQUES DU QUARTIER :
   *    - Sculpture "Écoute" (Henri de Miller, 1986) sur le parvis Sud-Ouest
   *    - Canopée du Forum des Halles (Châtelet – Les Halles)
   *    - Bouche de Métro Châtelet–Les Halles
   *    - Bourse de Commerce (Collection Pinault) & Colonne Médicis
   *    - Mobilier parisien : Colonnes Morris, Kiosque à journaux, Fontaine Wallace,
   *      Réverbères en fonte & Bancs Davioud
   * ==========================================================================
   */

  // A. Sculpture monumentale "Écoute" d'Henri de Miller (1986) — Place René-Cassin
  const ecouteGroup = new THREE.Group();
  ecouteGroup.position.set(-44.0, 0.05, 30.5);
  ecouteGroup.rotation.y = 0.48;
  envGroup.add(ecouteGroup);

  const matSandstone = new THREE.MeshStandardMaterial({ color: 0x9b9284, roughness: 0.88, metalness: 0.04 });
  addCylinder(3.1, 3.3, 0.24, 24, 0, 0.12, 0, matStoneTrim, { parent: ecouteGroup });
  const ecouteHead = new THREE.Mesh(new THREE.SphereGeometry(1.75, 22, 18), matSandstone);
  ecouteHead.scale.set(1.12, 0.92, 0.88);
  ecouteHead.position.set(-0.35, 1.65, 0);
  ecouteHead.rotation.z = -0.35;
  ecouteHead.castShadow = true;
  ecouteHead.receiveShadow = true;
  ecouteGroup.add(ecouteHead);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.72, 0.45), matSandstone);
  nose.position.set(-0.4, 1.62, 1.48);
  nose.rotation.x = -0.22;
  ecouteGroup.add(nose);
  const palm = new THREE.Mesh(new THREE.BoxGeometry(1.45, 1.35, 0.62), matSandstone);
  palm.position.set(1.35, 1.02, 0.72);
  palm.rotation.set(0.2, -0.45, 0.25);
  palm.castShadow = true;
  ecouteGroup.add(palm);
  for (let f = 0; f < 4; f++) {
    const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.95, 6, 10), matSandstone);
    finger.position.set(1.05 + f * 0.26, 1.78 - f * 0.1, 1.05 - f * 0.12);
    finger.rotation.set(0.32, -0.35, 0.42);
    finger.castShadow = true;
    ecouteGroup.add(finger);
  }
  circleColliders.push({ x: -44.0, z: 30.5, r: 3.3 });

  // B. La Canopée du Forum des Halles (Châtelet – Les Halles, Sud-Est)
  const canopeeGroup = new THREE.Group();
  canopeeGroup.position.set(42, 0, 84);
  envGroup.add(canopeeGroup);

  [-11.5, 11.5].forEach((cz) => {
    addBox(44, 11.0, 7.5, 0, 5.5, cz, matGlassModern, { parent: canopeeGroup });
    for (let cx = -20; cx <= 20; cx += 5) {
      addBox(0.35, 11.4, 7.9, cx, 5.7, cz, matLead, { parent: canopeeGroup });
    }
    addBox(44.6, 0.55, 8.0, 0, 11.2, cz, matLead, { parent: canopeeGroup });
  });
  const canopyGeo = new THREE.PlaneGeometry(54, 34, 24, 16);
  const posAttr = canopyGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const px = posAttr.getX(i);
    const py = posAttr.getY(i);
    const wave = Math.cos(px * 0.11) * 1.45 + Math.cos(py * 0.14) * 1.65 - (px * px) * 0.0014;
    posAttr.setZ(i, wave);
  }
  canopyGeo.computeVertexNormals();
  const canopyRoof = new THREE.Mesh(canopyGeo, matCanopeeGold);
  canopyRoof.rotation.x = -Math.PI * 0.5;
  canopyRoof.position.y = 13.8;
  canopyRoof.castShadow = true;
  canopeeGroup.add(canopyRoof);
  for (let nx = -22; nx <= 22; nx += 5.5) {
    addBox(0.28, 0.45, 32.5, nx, 12.6 + Math.cos(nx * 0.11) * 1.2, 0, matLead, { cast: false, parent: canopeeGroup });
  }

  // C. Bouche de Métro / RER "Châtelet – Les Halles"
  const metroGroup = new THREE.Group();
  metroGroup.position.set(22.0, 0.06, 34.5);
  envGroup.add(metroGroup);
  addBox(4.8, 0.08, 2.8, 0, 0.04, 0, matAsphalt, { cast: false, parent: metroGroup });
  addBox(5.0, 1.05, 0.14, 0, 0.55, -1.45, matParisGreen, { parent: metroGroup });
  addBox(5.0, 1.05, 0.14, 0, 0.55, 1.45, matParisGreen, { parent: metroGroup });
  addBox(0.14, 1.05, 3.0, 2.45, 0.55, 0, matParisGreen, { parent: metroGroup });
  const metroGlobeMat = new THREE.MeshStandardMaterial({
    color: 0xffe4a8,
    emissive: new THREE.Color(0xff9d3b),
    emissiveIntensity: 0.45,
    roughness: 0.25,
  });
  streetLampEmissives.push(metroGlobeMat);
  [-1.45, 1.45].forEach((mz) => {
    addCylinder(0.08, 0.11, 3.8, 8, -2.4, 1.9, mz, matParisGreen, { parent: metroGroup });
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), metroGlobeMat);
    globe.position.set(-2.4, 3.92, mz);
    metroGroup.add(globe);
  });
  const metroSignCanvas = document.createElement('canvas');
  metroSignCanvas.width = 256;
  metroSignCanvas.height = 64;
  const msCtx = metroSignCanvas.getContext('2d');
  msCtx.fillStyle = '#e7cf8e';
  msCtx.fillRect(0, 0, 256, 64);
  msCtx.strokeStyle = '#1d4d3a';
  msCtx.lineWidth = 8;
  msCtx.strokeRect(4, 4, 248, 56);
  msCtx.fillStyle = '#8b1e24';
  msCtx.font = 'bold 34px Georgia, serif';
  msCtx.textAlign = 'center';
  msCtx.fillText('MÉTRO', 128, 44);
  const metroSignTex = new THREE.CanvasTexture(metroSignCanvas);
  metroSignTex.colorSpace = THREE.SRGBColorSpace;
  addBox(0.16, 0.62, 2.75, -2.4, 3.35, 0, new THREE.MeshStandardMaterial({ map: metroSignTex, roughness: 0.35 }), { parent: metroGroup });
  circleColliders.push({ x: 22.0, z: 34.5, r: 2.8 });

  // D. La Bourse de Commerce (Collection Pinault) & Colonne Médicis (Ouest du Jardin Nelson-Mandela, perspective dégagée !)
  const bourseGroup = new THREE.Group();
  bourseGroup.position.set(-112, 0, 44);
  envGroup.add(bourseGroup);
  addCylinder(20, 20.6, 20, 32, 0, 10, 0, matStoneFacade, { parent: bourseGroup });
  addCylinder(21.2, 21.2, 1.4, 32, 0, 20.6, 0, matStoneTrim, { parent: bourseGroup });
  const bourseDome = new THREE.Mesh(
    new THREE.SphereGeometry(18.0, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.48),
    matGlassModern
  );
  bourseDome.position.y = 21.2;
  bourseGroup.add(bourseDome);
  const bourseLantern = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.8, 4.2, 12), matLead);
  bourseLantern.position.y = 39.6;
  bourseGroup.add(bourseLantern);
  addCylinder(1.2, 1.4, 31, 16, 15.5, 15.5, 15.5, matStoneFacade, { parent: bourseGroup });
  addCylinder(1.85, 1.85, 1.2, 16, 15.5, 31.4, 15.5, matStoneTrim, { parent: bourseGroup });

  // E. Colonnes Morris parisiennes (affiches spectacles) + Kiosque à journaux + Fontaine Wallace
  const matMorrisPoster = new THREE.MeshStandardMaterial({ map: createMorrisPosterTexture(), roughness: 0.62 });
  [[-66, -14], [14, -29], [56, 31]].forEach(([mx, mz]) => {
    const morris = new THREE.Group();
    morris.position.set(mx, 0.04, mz);
    addCylinder(0.86, 0.94, 0.72, 14, 0, 0.36, 0, matParisGreen, { parent: morris });
    addCylinder(0.76, 0.76, 2.75, 16, 0, 2.1, 0, matMorrisPoster, { parent: morris });
    addCylinder(1.06, 0.92, 0.32, 14, 0, 3.6, 0, matParisGreen, { parent: morris });
    const mDome = new THREE.Mesh(new THREE.SphereGeometry(0.95, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), matParisGreen);
    mDome.position.y = 3.72;
    morris.add(mDome);
    addCylinder(0.06, 0.14, 0.65, 8, 0, 4.88, 0, matParisGreen, { parent: morris });
    microPropsGroup.add(morris);
    circleColliders.push({ x: mx, z: mz, r: 1.05 });
  });

  // Kiosque à journaux parisien octogonal à la Pointe Saint-Eustache (-65, -26)
  const kiosk = new THREE.Group();
  kiosk.position.set(-65, 0.04, -26);
  addCylinder(2.15, 2.25, 2.8, 8, 0, 1.4, 0, matParisGreen, { parent: kiosk });
  addCylinder(2.2, 2.2, 1.3, 8, 0, 1.75, 0, matMorrisPoster, { parent: kiosk });
  const kRoof = new THREE.Mesh(new THREE.ConeGeometry(2.65, 1.55, 8), matParisGreen);
  kRoof.position.y = 3.55;
  kRoof.castShadow = true;
  kiosk.add(kRoof);
  envGroup.add(kiosk);
  circleColliders.push({ x: -65, z: -26, r: 2.3 });

  // Fontaine Wallace verte sur le parvis Sud-Ouest (-55, 22)
  const wallace = new THREE.Group();
  wallace.position.set(-55, 0.04, 22);
  addCylinder(0.52, 0.64, 0.85, 8, 0, 0.42, 0, matParisGreen, { parent: wallace });
  for (let c = 0; c < 4; c++) {
    const a = (c / 4) * Math.PI * 2;
    addCylinder(0.08, 0.1, 1.25, 8, Math.cos(a) * 0.34, 1.45, Math.sin(a) * 0.34, matParisGreen, { parent: wallace });
  }
  const wDome = new THREE.Mesh(new THREE.SphereGeometry(0.56, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), matParisGreen);
  wDome.position.y = 2.05;
  wallace.add(wDome);
  microPropsGroup.add(wallace);
  circleColliders.push({ x: -55, z: 22, r: 0.75 });

  // F. Réverbères parisiens en fonte & Bancs Davioud
  const sharedLampGlobeMat = new THREE.MeshStandardMaterial({
    color: 0xfff0cc,
    emissive: new THREE.Color(0xffb454),
    emissiveIntensity: 0.15,
    roughness: 0.25,
  });
  streetLampEmissives.push(sharedLampGlobeMat);

  const lampPositions = [
    [-58, -12], [-58, 12], [-58, -26], [-58, 26],
    [-32, 30],  [-12, 30], [14, 30],   [36, 30],
    [-28, -27], [16, -27], [58, -10],  [58, 10],
    [-3, 46],   [11, 46],  [-3, 66],   [11, 66],
    [-3, 84],   [11, 84],
  ];
  lampPositions.forEach(([lx, lz]) => {
    const pole = new THREE.Group();
    pole.position.set(lx, 0, lz);
    addCylinder(0.08, 0.17, 4.7, 8, 0, 2.35, 0, matIron, { parent: pole });
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), sharedLampGlobeMat);
    globe.position.y = 4.95;
    pole.add(globe);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.35, 8), matIron);
    cap.position.y = 5.3;
    pole.add(cap);
    envGroup.add(pole);
  });

  function addParisianBench(bx, bz, rotY = 0) {
    const b = new THREE.Group();
    b.position.set(bx, 0.06, bz);
    b.rotation.y = rotY;
    addBox(2.2, 0.09, 0.52, 0, 0.46, 0, matWoodOrgan, { parent: b });
    addBox(2.2, 0.42, 0.08, 0, 0.74, -0.22, matWoodOrgan, { parent: b });
    [-0.85, 0.85].forEach((lx) => {
      addBox(0.1, 0.46, 0.5, lx, 0.23, 0, matIron, { parent: b });
    });
    envGroup.add(b);
  }
  function addMicroBench(bx, bz, rotY = 0) {
    const b = new THREE.Group();
    b.position.set(bx, 0.06, bz);
    b.rotation.y = rotY;
    addBox(2.2, 0.09, 0.52, 0, 0.46, 0, matWoodOrgan, { parent: b });
    addBox(2.2, 0.42, 0.08, 0, 0.74, -0.22, matWoodOrgan, { parent: b });
    [-0.85, 0.85].forEach((lx) => {
      addBox(0.1, 0.46, 0.5, lx, 0.23, 0, matIron, { parent: b });
    });
    microPropsGroup.add(b);
  }
  [
    [-61, -7, Math.PI * 0.5], [-61, 7, Math.PI * 0.5],
    [-16, 31.5, 0], [16, 31.5, 0],
    [-2.0, 50, Math.PI * 0.5], [10.0, 50, -Math.PI * 0.5],
    [-2.0, 72, Math.PI * 0.5], [10.0, 72, -Math.PI * 0.5],
  ].forEach((args) => addMicroBench(...args));

  // Bornes anti-stationnement parisiennes le long du parvis Ouest & Nord
  for (let bz = -20; bz <= 20; bz += 5.0) {
    addCylinder(0.08, 0.1, 0.78, 8, -67.5, 0.42, bz, matIron, { parent: microPropsGroup });
  }

  mergeStaticGroupByMaterial(microPropsGroup);
  return envGroup;
}
