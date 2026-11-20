import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * ============================================================================
 * MOTEUR DE PERFORMANCE PARIS 3D (< 250 DRAW CALLS, FUSION GÉOMÉTRIQUE & LOD)
 * - Fusionne les géométries statiques par matériau via mergeGeometries sans
 *   perdre un seul détail architectural des monuments ou de la ville.
 * - Gère le LOD à 3 niveaux (Intérieur + Détails / Extérieur / Skyline lointaine).
 * - Pilote les profils graphiques Éco / Équilibré / Ultra et le moniteur FPS/DC.
 * ============================================================================
 */

const tmpRelMat = new THREE.Matrix4();
const tmpEustachePos = new THREE.Vector3(0, 0, 0);
const tmpEiffelPos = new THREE.Vector3(-3694, 0, 556);
const tmpArcPos = new THREE.Vector3(-3658, 18, -1156);
const tmpGarnierPos = new THREE.Vector3(-980, 0, -956);
const tmpNotreDamePos = new THREE.Vector3(358, 0.45, 1156);
const tmpSacreCoeurPos = new THREE.Vector3(-139, 90, -2591);
const tmpPantheonPos = new THREE.Vector3(102, 26, 1913);

export const QUALITY_PRESETS = {
  eco: {
    name: 'eco',
    label: 'Éco',
    maxPixelRatio: 1.0,
    shadowMapSize: 1024,
    shadowSoft: false,
    shadowRadius: 120,
    shadowInterval: 6,
    far: 7800,
    fogDensity: 0.00021,
    eustacheLod0: 155,
    eustacheLod1: 680,
    eiffelLod0: 320,
    eiffelLod1: 1250,
    arcLod0: 180,
    arcLod1: 780,
    garnierLod0: 175,
    garnierLod1: 760,
    notreDameLod0: 180,
    notreDameLod1: 780,
    sacreCoeurLod0: 195,
    sacreCoeurLod1: 820,
    pantheonLod0: 185,
    pantheonLod1: 800,
    lifeMaxDist: 210,
    maxBoats: 3,
  },
  balanced: {
    name: 'balanced',
    label: 'Équilibré',
    maxPixelRatio: 1.35,
    shadowMapSize: 2048,
    shadowSoft: true,
    shadowRadius: 165,
    shadowInterval: 2,
    far: 10500,
    fogDensity: 0.00016,
    eustacheLod0: 235,
    eustacheLod1: 980,
    eiffelLod0: 480,
    eiffelLod1: 1650,
    arcLod0: 260,
    arcLod1: 1100,
    garnierLod0: 255,
    garnierLod1: 1100,
    notreDameLod0: 265,
    notreDameLod1: 1150,
    sacreCoeurLod0: 290,
    sacreCoeurLod1: 1200,
    pantheonLod0: 280,
    pantheonLod1: 1180,
    lifeMaxDist: 380,
    maxBoats: 5,
  },
  ultra: {
    name: 'ultra',
    label: 'Ultra',
    maxPixelRatio: 1.5,
    shadowMapSize: 4096,
    shadowSoft: true,
    shadowRadius: 225,
    shadowInterval: 1,
    far: 11500,
    fogDensity: 0.00014,
    eustacheLod0: 340,
    eustacheLod1: 1450,
    eiffelLod0: 680,
    eiffelLod1: 2400,
    arcLod0: 380,
    arcLod1: 1600,
    garnierLod0: 370,
    garnierLod1: 1600,
    notreDameLod0: 385,
    notreDameLod1: 1650,
    sacreCoeurLod0: 410,
    sacreCoeurLod1: 1700,
    pantheonLod0: 400,
    pantheonLod1: 1680,
    lifeMaxDist: 560,
    maxBoats: 5,
  },
};

function hasNoMergeAncestor(obj, stopAt) {
  let cur = obj;
  while (cur && cur !== stopAt) {
    if (cur.userData?.noMerge) return true;
    cur = cur.parent;
  }
  return false;
}

function reverseTriangleWinding(geo) {
  const attrs = Object.values(geo.attributes);
  const count = geo.attributes.position.count;
  for (let i = 0; i + 2 < count; i += 3) {
    for (let a = 0; a < attrs.length; a++) {
      const attr = attrs[a];
      const itemSize = attr.itemSize;
      const arr = attr.array;
      const o1 = (i + 1) * itemSize;
      const o2 = (i + 2) * itemSize;
      for (let k = 0; k < itemSize; k++) {
        const tmp = arr[o1 + k];
        arr[o1 + k] = arr[o2 + k];
        arr[o2 + k] = tmp;
      }
    }
  }
}

function normalizeGeometryForMerge(srcGeo, relMatrix) {
  const g = srcGeo.index ? srcGeo.toNonIndexed() : srcGeo.clone();
  if (!g.attributes.position) {
    g.dispose();
    return null;
  }

  for (const attrName of Object.keys(g.attributes)) {
    if (attrName !== 'position' && attrName !== 'normal' && attrName !== 'uv') {
      g.deleteAttribute(attrName);
    }
  }

  if (!g.attributes.normal) {
    g.computeVertexNormals();
  }
  if (!g.attributes.uv) {
    const count = g.attributes.position.count;
    g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
  }

  g.applyMatrix4(relMatrix);
  if (relMatrix.determinant() < 0) {
    reverseTriangleWinding(g);
  }
  return g;
}

/**
 * Fusionne tous les Mesh statiques d'un groupe (par matériau + options d'ombre)
 * en conservant strictement la géométrie exacte et les UVs.
 */
export function mergeStaticGroupByMaterial(targetGroup, { skipPredicate = null } = {}) {
  if (!targetGroup) return { beforeCount: 0, afterCount: 0 };

  targetGroup.updateWorldMatrix(true, true);
  const invGroup = targetGroup.matrixWorld.clone().invert();

  const buckets = new Map();
  const toRemove = [];

  targetGroup.traverse((obj) => {
    if (!obj.isMesh || obj.isInstancedMesh || obj.isSkinnedMesh) return;
    if (Array.isArray(obj.material) || !obj.geometry || !obj.material) return;
    if (!obj.visible) return;
    if (hasNoMergeAncestor(obj, targetGroup)) return;
    if (skipPredicate && skipPredicate(obj)) return;

    tmpRelMat.multiplyMatrices(invGroup, obj.matrixWorld);
    const normGeo = normalizeGeometryForMerge(obj.geometry, tmpRelMat);
    if (!normGeo) return;

    const key = `${obj.material.uuid}|${obj.castShadow ? 1 : 0}|${obj.receiveShadow ? 1 : 0}|${obj.renderOrder || 0}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        material: obj.material,
        castShadow: Boolean(obj.castShadow),
        receiveShadow: Boolean(obj.receiveShadow),
        renderOrder: obj.renderOrder || 0,
        geos: [],
      };
      buckets.set(key, bucket);
    }
    bucket.geos.push(normGeo);
    toRemove.push(obj);
  });

  if (toRemove.length <= buckets.size) {
    buckets.forEach((b) => b.geos.forEach((g) => g.dispose()));
    return { beforeCount: toRemove.length, afterCount: toRemove.length };
  }

  const created = [];
  buckets.forEach((bucket) => {
    const merged = mergeGeometries(bucket.geos, false);
    bucket.geos.forEach((g) => g.dispose());
    if (!merged) {
      console.warn('[perf-manager] Échec mergeGeometries pour matériau:', bucket.material.name || bucket.material.uuid);
      return;
    }
    merged.computeBoundingSphere();
    merged.computeBoundingBox();

    const mesh = new THREE.Mesh(merged, bucket.material);
    mesh.castShadow = bucket.castShadow;
    mesh.receiveShadow = bucket.receiveShadow;
    mesh.renderOrder = bucket.renderOrder;
    mesh.frustumCulled = true;
    created.push(mesh);
  });

  // Retrait uniquement des anciens meshes dont la fusion a réussi
  if (created.length > 0) {
    toRemove.forEach((oldMesh) => {
      if (oldMesh.parent) oldMesh.parent.remove(oldMesh);
      if (oldMesh.geometry) oldMesh.geometry.dispose();
    });

    // Nettoyage des sous-groupes devenus vides
    const emptyGroups = [];
    targetGroup.traverse((child) => {
      if (child !== targetGroup && child.isGroup && !child.userData?.keepGroup && !hasNoMergeAncestor(child, targetGroup)) {
        if (child.children.length === 0) emptyGroups.push(child);
      }
    });
    for (let i = emptyGroups.length - 1; i >= 0; i--) {
      const grp = emptyGroups[i];
      if (grp.parent && grp.children.length === 0) grp.parent.remove(grp);
    }

    created.forEach((m) => targetGroup.add(m));
  }

  return { beforeCount: toRemove.length, afterCount: created.length };
}

/**
 * Silhouette LOD Niveau 2 (> 980 m) pour Saint-Eustache dans la skyline parisienne
 */
function buildSaintEustacheSkylineLOD() {
  const g = new THREE.Group();
  g.name = 'SaintEustacheSkylineLOD';

  const matStone = new THREE.MeshStandardMaterial({ color: 0xdfd1b8, roughness: 0.85 });
  const matSlate = new THREE.MeshStandardMaterial({ color: 0x343e4c, roughness: 0.62, metalness: 0.2 });

  const addPart = (geo, mat, x, y, z, rotY = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.y = rotY;
    m.receiveShadow = true;
    g.add(m);
  };

  // Nef + Chœur, Bas-côtés, Transept, Tour Nord achevée & Tour Sud tronquée
  addPart(new THREE.BoxGeometry(74, 33.5, 19), matStone, -9, 16.75, 0);
  addPart(new THREE.BoxGeometry(70, 19, 41), matStone, -9, 9.5, 0);
  addPart(new THREE.BoxGeometry(14, 33.5, 45), matStone, 4, 16.75, 0);
  addPart(new THREE.BoxGeometry(6.5, 46, 6.5), matStone, -47, 23, -13);
  addPart(new THREE.BoxGeometry(6.5, 32, 6.5), matStone, -47, 16, 13);

  // Grands toits pentus d'ardoise & flèche de croisée
  addPart(new THREE.ConeGeometry(11, 74, 4), matSlate, -9, 39, 0);
  addPart(new THREE.BoxGeometry(72, 9.5, 16), matSlate, -9, 38.2, 0);
  addPart(new THREE.BoxGeometry(12, 9.5, 43), matSlate, 4, 38.2, 0);
  addPart(new THREE.ConeGeometry(2.6, 22, 8), matSlate, 4, 52, 0);

  mergeStaticGroupByMaterial(g);
  g.visible = false;
  return g;
}

export function createPerfManager({
  renderer,
  scene,
  camera,
  lighting,
  parisWorld,
  saintEustache,
  tourEiffel,
  arcDeTriomphe,
  palaisGarnier,
  notreDame,
  sacreCoeur,
  pantheon,
  livingWorld,
  ui,
}) {
  let currentQuality = 'balanced';
  let frameIndex = 0;
  let fpsAccumTime = 0;
  let fpsAccumFrames = 0;
  let lastFps = 60;
  let lastDrawCalls = 0;
  let forceShadowNextFrame = true;

  // Silhouette Skyline LOD Niveau 2 pour Saint-Eustache (> 980 m : 2 DC au lieu de ~45 DC)
  const eustacheSkylineLod = buildSaintEustacheSkylineLOD();
  scene.add(eustacheSkylineLod);

  function applyQualityButtonsUI() {
    if (!ui?.qualityBtns) return;
    ui.qualityBtns.forEach((btn) => {
      const active = btn.dataset.quality === currentQuality;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  }

  function setQuality(presetName) {
    const p = QUALITY_PRESETS[presetName] || QUALITY_PRESETS.balanced;
    currentQuality = p.name;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, p.maxPixelRatio));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.shadowMap.autoUpdate = false;

    lighting.setShadowQuality({
      mapSize: p.shadowMapSize,
      radius: p.shadowRadius,
      soft: p.shadowSoft,
    });

    camera.far = p.far;
    camera.updateProjectionMatrix();

    if (scene.fog) {
      scene.fog.density = p.fogDensity;
    }
    parisWorld.setMaxBoats?.(p.maxBoats);

    forceShadowNextFrame = true;
    renderer.shadowMap.needsUpdate = true;
    applyQualityButtonsUI();
  }

  function computeLod(dist, l0, l1) {
    if (dist < l0) return 0;
    if (dist < l1) return 1;
    return 2;
  }

  function beforeRender(dt) {
    const p = QUALITY_PRESETS[currentQuality];
    frameIndex++;

    const distEustache = camera.position.distanceTo(tmpEustachePos);
    const distEiffel = camera.position.distanceTo(tmpEiffelPos);
    const distArc = camera.position.distanceTo(tmpArcPos);
    const distGarnier = camera.position.distanceTo(tmpGarnierPos);
    const distNotreDame = camera.position.distanceTo(tmpNotreDamePos);
    const distSacreCoeur = camera.position.distanceTo(tmpSacreCoeurPos);
    const distPantheon = camera.position.distanceTo(tmpPantheonPos);

    // Distance horizontale de la caméra au segment Étoile (-3658, -1156) -> Concorde (-1741, -245)
    const ceDx = 1917;
    const ceDz = 911;
    const ceLenSq = ceDx * ceDx + ceDz * ceDz;
    const ceT = Math.max(0, Math.min(1, ((camera.position.x - -3658) * ceDx + (camera.position.z - -1156) * ceDz) / ceLenSq));
    const cePx = -3658 + ceT * ceDx;
    const cePz = -1156 + ceT * ceDz;
    const distChamps = Math.hypot(camera.position.x - cePx, camera.position.z - cePz, Math.max(0, camera.position.y - 25));

    const lodEustache = computeLod(distEustache, p.eustacheLod0, p.eustacheLod1);
    const lodEiffel = computeLod(distEiffel, p.eiffelLod0, p.eiffelLod1);
    const lodArc = computeLod(distArc, p.arcLod0, p.arcLod1);
    const lodGarnier = computeLod(distGarnier, p.garnierLod0, p.garnierLod1);
    const lodNotreDame = computeLod(distNotreDame, p.notreDameLod0, p.notreDameLod1);
    const lodSacreCoeur = computeLod(distSacreCoeur, p.sacreCoeurLod0, p.sacreCoeurLod1);
    const lodPantheon = computeLod(distPantheon, p.pantheonLod0, p.pantheonLod1);

    if (lodEustache === 2 && saintEustache?.root) {
      saintEustache.root.visible = false;
      eustacheSkylineLod.visible = true;
    } else {
      eustacheSkylineLod.visible = false;
      saintEustache.setLodLevel?.(lodEustache, distEustache);
    }

    tourEiffel.setLodLevel?.(lodEiffel, distEiffel);

    arcDeTriomphe?.setLodLevel?.(lodArc, distArc);

    palaisGarnier?.setLodLevel?.(lodGarnier, distGarnier);

    notreDame?.setLodLevel?.(lodNotreDame, distNotreDame);

    sacreCoeur?.setLodLevel?.(lodSacreCoeur, distSacreCoeur);

    pantheon?.setLodLevel?.(lodPantheon, distPantheon);

    if (livingWorld?.root) {
      livingWorld.root.visible = Math.min(distEustache, distEiffel, distArc, distGarnier, distNotreDame, distSacreCoeur, distPantheon, distChamps) < p.lifeMaxDist;
    }

    const movedCell = lighting.updateShadowFocus(camera.position);
    const sunDirty = lighting.consumeSunDirty();
    if (forceShadowNextFrame || movedCell || sunDirty || frameIndex % p.shadowInterval === 0) {
      renderer.shadowMap.needsUpdate = true;
      forceShadowNextFrame = false;
    }
    void dt;
  }

  function afterRender(dt) {
    lastDrawCalls = renderer.info.render.calls;
    fpsAccumTime += Math.min(dt, 0.25);
    fpsAccumFrames += 1;

    if (fpsAccumTime >= 0.4) {
      lastFps = Math.max(1, Math.round(fpsAccumFrames / fpsAccumTime));
      fpsAccumTime = 0;
      fpsAccumFrames = 0;

      if (ui?.perfReadout) {
        ui.perfReadout.textContent = `${lastFps} FPS • ${lastDrawCalls} DC`;
        ui.perfReadout.classList.toggle('warn', lastDrawCalls > 250 || lastFps < 25);
      }
    } else if (frameIndex <= 4 && ui?.perfReadout) {
      ui.perfReadout.textContent = `-- FPS • ${lastDrawCalls} DC`;
      ui.perfReadout.classList.toggle('warn', lastDrawCalls > 250);
    }
  }

  setQuality('balanced');

  return {
    setQuality,
    beforeRender,
    afterRender,
    getQuality: () => currentQuality,
    getStats: () => ({
      fps: lastFps,
      drawCalls: lastDrawCalls,
      triangles: renderer.info.render.triangles,
      quality: currentQuality,
    }),
  };
}
