import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { MONUMENTS, SEINE_POINTS, distanceToPolyline, getParisElevation } from './paris-data.js';
import { worldToChampsLocal } from './monuments/champs-elysees.js';
import { worldToGarnierLocal } from './monuments/palais-garnier.js';
import { worldToNotreDameLocal } from './monuments/notre-dame.js';
import { worldToSacreCoeurLocal, SACRE_COEUR_WORLD_POS } from './monuments/sacre-coeur.js';
import { worldToPantheonLocal, PANTHEON_WORLD_POS } from './monuments/pantheon.js';

/**
 * ============================================================================
 * NAVIGATION PARIS 3D — DRONE / PIÉTON FPS + VOL PARABOLIQUE INTER-QUARTIERS
 * - ZQSD + WASD + Flèches directionnelles + Shift (pas rapide)
 * - Changement dynamique du contexte de collisions / hauteur de sol par monument
 * ============================================================================
 */

const EYE_HEIGHT = 1.75;
const PLAYER_RADIUS = 0.48;
const WALK_SPEED = 7.8;
const SPRINT_SPEED = 16.0;

export function createCameraController({
  camera,
  domElement,
  onModeChange = () => {},
  onPointerLockChange = () => {},
}) {
  const orbit = new OrbitControls(camera, domElement);
  orbit.enableDamping = true;
  orbit.dampingFactor = 0.065;
  orbit.maxPolarAngle = Math.PI * 0.90;
  orbit.minDistance = 8;
  orbit.maxDistance = 1400;
  orbit.target.set(-10, 16, 0);

  camera.position.set(-92, 33, 42);
  orbit.update();

  const pointerLock = new PointerLockControls(camera, domElement);

  const context = {
    monumentId: 'saint-eustache',
    colliders: [],
    circleColliders: [],
    worldBounds: { minX: -5200, maxX: 2400, minZ: -3200, maxZ: 2700 },
    getFloorHeightAt: (x, z) => getParisElevation(x, z),
    fpsSpawnPos: new THREE.Vector3(-59, 1.75, 0),
    fpsSpawnTarget: new THREE.Vector3(-30, 6.5, 0),
  };

  function setActiveMonumentContext({
    id,
    colliders = [],
    circleColliders = [],
    worldBounds = { minX: -5200, maxX: 2400, minZ: -3200, maxZ: 2700 },
    getFloorHeightAt = null,
    fpsSpawnPos = null,
    fpsSpawnTarget = null,
  }) {
    context.monumentId = id;
    context.colliders = colliders;
    context.circleColliders = circleColliders;
    context.worldBounds = worldBounds;
    if (getFloorHeightAt) context.getFloorHeightAt = getFloorHeightAt;
    if (fpsSpawnPos) context.fpsSpawnPos.copy(fpsSpawnPos);
    if (fpsSpawnTarget) context.fpsSpawnTarget.copy(fpsSpawnTarget);
  }

  const state = {
    mode: 'orbit', // 'orbit' | 'fps'
    isDraggingLook: false,
    lastPointerX: 0,
    lastPointerY: 0,
    yaw: 0,
    pitch: 0,
    keys: new Set(),
    flyAnim: null,
    orbit360: null,
  };

  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const forwardVec = new THREE.Vector3();
  const rightVec = new THREE.Vector3();
  const moveVec = new THREE.Vector3();
  const lookTargetVec = new THREE.Vector3();

  function syncAnglesFromCamera() {
    euler.setFromQuaternion(camera.quaternion, 'YXZ');
    state.yaw = euler.y;
    state.pitch = THREE.MathUtils.clamp(euler.x, -Math.PI * 0.44, Math.PI * 0.46);
  }

  function applyFpsAngles() {
    euler.set(state.pitch, state.yaw, 0, 'YXZ');
    camera.quaternion.setFromEuler(euler);
  }

  const ARC_WORLD_X = -3658;
  const ARC_WORLD_Z = -1156;
  const ARC_ROT_Y = Math.PI * 0.5 - Math.atan2(911, 1917);
  const ARC_COS = Math.cos(ARC_ROT_Y);
  const ARC_SIN = Math.sin(ARC_ROT_Y);

  function resolveCollisions(pos) {
    const wb = context.worldBounds;
    pos.x = THREE.MathUtils.clamp(pos.x, wb.minX, wb.maxX);
    pos.z = THREE.MathUtils.clamp(pos.z, wb.minZ, wb.maxZ);

    // Garde-fou de la terrasse panoramique (50 m) de l'Arc de Triomphe
    if (context.monumentId === 'arc-de-triomphe' && pos.y > 55) {
      const dx = pos.x - ARC_WORLD_X;
      const dz = pos.z - ARC_WORLD_Z;
      const lx = THREE.MathUtils.clamp(dx * ARC_COS - dz * ARC_SIN, -19.8, 19.8);
      const lz = THREE.MathUtils.clamp(dx * ARC_SIN + dz * ARC_COS, -8.6, 8.6);
      pos.x = ARC_WORLD_X + lx * ARC_COS + lz * ARC_SIN;
      pos.z = ARC_WORLD_Z - lx * ARC_SIN + lz * ARC_COS;
      return;
    }

    // Garde-fou circulaire du Belvédère du Grand Dôme du Sacré-Cœur (ly = 71,3 m)
    if (context.monumentId === 'sacre-coeur' && pos.y > 152) {
      const dx = pos.x - SACRE_COEUR_WORLD_POS.x;
      const dz = pos.z - SACRE_COEUR_WORLD_POS.z;
      const r = Math.hypot(dx, dz) || 0.001;
      const clampedR = THREE.MathUtils.clamp(r, 3.6, 4.75);
      pos.x = SACRE_COEUR_WORLD_POS.x + (dx / r) * clampedR;
      pos.z = SACRE_COEUR_WORLD_POS.z + (dz / r) * clampedR;
      return;
    }

    // Garde-fou circulaire de la Colonnade Panoramique du Dôme du Panthéon (ly = 51,5 m)
    if (context.monumentId === 'pantheon' && pos.y > PANTHEON_WORLD_POS.y + 42) {
      const dx = pos.x - PANTHEON_WORLD_POS.x;
      const dz = pos.z - PANTHEON_WORLD_POS.z;
      const r = Math.hypot(dx, dz) || 0.001;
      const clampedR = THREE.MathUtils.clamp(r, 12.9, 15.6);
      pos.x = PANTHEON_WORLD_POS.x + (dx / r) * clampedR;
      pos.z = PANTHEON_WORLD_POS.z + (dz / r) * clampedR;
      return;
    }

    const colliders = context.colliders;
    const circleColliders = context.circleColliders;

    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < colliders.length; i++) {
        const b = colliders[i];
        const closestX = THREE.MathUtils.clamp(pos.x, b.minX, b.maxX);
        const closestZ = THREE.MathUtils.clamp(pos.z, b.minZ, b.maxZ);
        const dx = pos.x - closestX;
        const dz = pos.z - closestZ;
        const distSq = dx * dx + dz * dz;

        if (distSq < PLAYER_RADIUS * PLAYER_RADIUS) {
          if (distSq > 1e-6) {
            const dist = Math.sqrt(distSq);
            const push = PLAYER_RADIUS - dist;
            pos.x += (dx / dist) * push;
            pos.z += (dz / dist) * push;
          } else {
            const penLeft = Math.abs(pos.x - b.minX);
            const penRight = Math.abs(b.maxX - pos.x);
            const penTop = Math.abs(pos.z - b.minZ);
            const penBottom = Math.abs(b.maxZ - pos.z);
            const minPen = Math.min(penLeft, penRight, penTop, penBottom);
            if (minPen === penLeft) pos.x = b.minX - PLAYER_RADIUS;
            else if (minPen === penRight) pos.x = b.maxX + PLAYER_RADIUS;
            else if (minPen === penTop) pos.z = b.minZ - PLAYER_RADIUS;
            else pos.z = b.maxZ + PLAYER_RADIUS;
          }
        }
      }

      for (let i = 0; i < circleColliders.length; i++) {
        const c = circleColliders[i];
        const dx = pos.x - c.x;
        const dz = pos.z - c.z;
        const minDist = c.r + PLAYER_RADIUS;
        const distSq = dx * dx + dz * dz;
        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq) || 0.001;
          const push = minDist - dist;
          pos.x += (dx / dist) * push;
          pos.z += (dz / dist) * push;
        }
      }
    }
  }

  function setMode(nextMode, { preservePosition = false } = {}) {
    if (nextMode !== 'orbit' && nextMode !== 'fps') return;
    if (state.mode === nextMode && !preservePosition) return;

    state.flyAnim = null;
    state.orbit360 = null;
    if (pointerLock.isLocked) {
      pointerLock.unlock();
    }

    state.mode = nextMode;

    if (nextMode === 'fps') {
      orbit.enabled = false;
      if (!preservePosition) {
        const floorY = context.getFloorHeightAt(camera.position.x, camera.position.z, camera.position.y);
        const distFromSpawn = camera.position.distanceTo(context.fpsSpawnPos);
        if (camera.position.y - floorY > 12 || distFromSpawn > 520) {
          camera.position.copy(context.fpsSpawnPos);
          camera.lookAt(context.fpsSpawnTarget);
        } else {
          camera.position.y = floorY + EYE_HEIGHT;
        }
        resolveCollisions(camera.position);
      }
      syncAnglesFromCamera();
      applyFpsAngles();
    } else {
      orbit.enabled = true;
      if (!preservePosition) {
        camera.getWorldDirection(lookTargetVec);
        orbit.target.copy(camera.position).addScaledVector(lookTargetVec, 32);
        orbit.target.y = Math.max(2, orbit.target.y);
        orbit.update();
      }
    }

    onModeChange(state.mode);
  }

  function toggleMode() {
    setMode(state.mode === 'orbit' ? 'fps' : 'orbit');
  }

  function requestPointerLock() {
    if (state.mode !== 'fps') {
      setMode('fps');
    }
    try {
      pointerLock.lock();
    } catch {
      // Ignore
    }
  }

  function enterFpsAt(position, target) {
    state.flyAnim = null;
    state.orbit360 = null;
    if (pointerLock.isLocked) pointerLock.unlock();
    const floorY = context.getFloorHeightAt(position.x, position.z, position.y);
    camera.position.set(position.x, floorY + EYE_HEIGHT, position.z);
    resolveCollisions(camera.position);
    camera.lookAt(target.x, Math.max(1.5, target.y), target.z);
    state.mode = 'fps';
    orbit.enabled = false;
    syncAnglesFromCamera();
    applyFpsAngles();
    onModeChange('fps');
  }

  // Vol direct fluide
  function flyTo(targetPos, targetLookAt, { duration = 1.65, arcHeight = 0, onComplete = null } = {}) {
    if (pointerLock.isLocked) pointerLock.unlock();
    state.orbit360 = null;

    const startLook = new THREE.Vector3();
    if (state.mode === 'orbit') {
      startLook.copy(orbit.target);
    } else {
      camera.getWorldDirection(startLook).multiplyScalar(18).add(camera.position);
    }

    state.flyAnim = {
      startPos: camera.position.clone(),
      endPos: targetPos.clone(),
      startLook,
      endLook: targetLookAt.clone(),
      arcHeight,
      elapsed: 0,
      duration,
      onComplete,
    };
  }

  // Vol parabolique spectaculaire au-dessus de Paris (entre deux monuments distants)
  function flyArcTo(endPos, endLook, { duration = 2.65, arcHeight = 280, onComplete = null } = {}) {
    if (state.mode === 'fps') {
      setMode('orbit', { preservePosition: true });
    }
    const dist = camera.position.distanceTo(endPos);
    const adaptiveArc = dist > 450 ? Math.min(380, dist * 0.14 + 95) : 0;
    const adaptiveDur = dist > 450 ? Math.min(3.2, 1.8 + dist / 2600) : 1.5;
    flyTo(endPos, endLook, {
      duration: duration || adaptiveDur,
      arcHeight: arcHeight !== undefined ? Math.min(arcHeight, adaptiveArc) : adaptiveArc,
      onComplete,
    });
  }

  function startOrbit360({
    center = new THREE.Vector3(-2, 16, 0),
    rx = 94,
    rz = 74,
    baseHeight = 36,
    duration = 30,
    startAngle = Math.PI * 0.82,
  } = {}) {
    if (pointerLock.isLocked) pointerLock.unlock();
    if (state.mode !== 'orbit') {
      setMode('orbit', { preservePosition: true });
    }
    state.flyAnim = null;

    const startLook = orbit.target.clone();
    state.orbit360 = {
      center: center.clone(),
      rx,
      rz,
      baseHeight,
      duration,
      startAngle,
      elapsed: 0,
      paused: false,
      startPos: camera.position.clone(),
      startLook,
    };
  }

  function setOrbit360Paused(paused) {
    if (state.orbit360) state.orbit360.paused = paused;
  }

  function cancelFlight() {
    state.flyAnim = null;
    state.orbit360 = null;
  }

  function getZoneName() {
    const { x, y, z } = camera.position;

    // 1. Secteur Saint-Eustache (0, 0)
    if (Math.hypot(x, z) < 180) {
      if (y > 26 && state.mode === 'orbit') return 'Paris • Quartier des Halles';
      if (x >= 41.5 && x <= 57 && Math.abs(z) < 5.8 && y < 14) return 'Saint-Eustache • Chapelle de la Vierge';
      if (x >= 26 && Math.hypot(x - 26, z) < 19.2 && y < 32) return 'Saint-Eustache • Déambulatoire & Chevet';
      if (x >= 10 && x < 26 && Math.abs(z) < 19.2 && y < 33) return 'Saint-Eustache • Chœur & Maître-Autel';
      if (x >= -2.5 && x < 10.5 && Math.abs(z) < 22.6 && y < 33) return 'Saint-Eustache • Transept & Croisée';
      if (x >= -45.5 && x < -2.5 && Math.abs(z) < 19.2 && y < 33) return 'Saint-Eustache • Grande Nef (33,5 m)';
      if (z > 24) return 'Jardin Nelson-Mandela • Les Halles';
      return 'Parvis de Saint-Eustache';
    }

    // 2. Secteur Tour Eiffel (-3694, +556)
    const dEiffel = Math.hypot(x + 3694, z - 556);
    if (dEiffel < 650) {
      if (dEiffel < 55 && y > 250) return 'Tour Eiffel • Sommet (276 – 330 m)';
      if (dEiffel < 55 && y > 100) return 'Tour Eiffel • 2e Étage (115,7 m)';
      if (dEiffel < 65 && y > 45) return 'Tour Eiffel • 1er Étage (57,6 m)';
      if (Math.hypot(x + 3830, z - 415) < 90) return 'Pont d’Iéna • La Seine';
      if (Math.hypot(x + 4020, z - 220) < 220) return 'Esplanade du Trocadéro';
      if (z > 680) return 'Champ-de-Mars • École Militaire';
      return 'Parvis de la Tour Eiffel';
    }

    // 2b. Secteur Arc de Triomphe • Place Charles-de-Gaulle (-3658, -1156)
    const dArc = Math.hypot(x + 3658, z + 1156);
    if (dArc < 148) {
      if (dArc < 30 && y > 58) return 'Arc de Triomphe • Terrasse Panoramique (50 m)';
      if (dArc < 28 && y < 46) return 'Arc de Triomphe • Tombe du Soldat Inconnu';
      return 'Place Charles-de-Gaulle • Étoile';
    }

    // 2c. Corridor complet de l'Avenue des Champs-Élysées -> Concorde
    const ce = worldToChampsLocal(x, z);
    if (ce.lz >= 145 && ce.lz <= 2260 && Math.abs(ce.lx) < 260) {
      if (ce.lz < 1095) return 'Avenue des Champs-Élysées • Triangle d’Or';
      if (ce.lz < 1265) return 'Rond-Point des Champs-Élysées';
      if (ce.lz < 1985) {
        return ce.lx < -95 ? 'Grand Palais & Petit Palais' : 'Jardins des Champs-Élysées';
      }
      return 'Place de la Concorde • Obélisque';
    }

    // 2d. Secteur Palais Garnier & Place de l'Opéra (-980, 0, -956)
    const pg = worldToGarnierLocal(x, z);
    if (Math.abs(pg.lx) < 105 && pg.lz > -105 && pg.lz < 225) {
      if (Math.abs(pg.lx) < 30 && pg.lz > -26 && pg.lz < 82 && y < 32) {
        if (pg.lz >= 61 && y > 8.5) return 'Palais Garnier • Le Grand Foyer Doré';
        if (pg.lz < 18) return 'Palais Garnier • Grande Salle & Plafond Chagall';
        if (pg.lz < 55) return 'Palais Garnier • Grand Escalier d’Honneur';
        return 'Palais Garnier • Vestibule & Bassin de la Pythie';
      }
      if (pg.lz > 132) return 'Place de l’Opéra • Café de la Paix';
      return 'Parvis du Palais Garnier • Opéra';
    }

    // 2e. Secteur Cathédrale Notre-Dame & Île de la Cité (+358, 0.45, +1156)
    const nd = worldToNotreDameLocal(x, z);
    if (nd.lx > -160 && nd.lx < 145 && Math.abs(nd.lz) < 82) {
      if (y < 36 && ((nd.lx >= -58 && nd.lx <= 44 && Math.abs(nd.lz) < 20) || (nd.lx >= 3 && nd.lx <= 19 && Math.abs(nd.lz) < 25))) {
        if (nd.lx > 20) return 'Notre-Dame • Chœur & Pietà';
        if (nd.lx >= 3) return 'Notre-Dame • Croisée & Grandes Rosaces';
        return 'Notre-Dame • Grande Nef Gothique';
      }
      if (nd.lx > 58) return 'Square Jean-XXIII • Chevet';
      return 'Parvis Notre-Dame • Point Zéro';
    }

    // 2f. Secteur Basilique du Sacré-Cœur & Village de Montmartre (-139, +90, -2591)
    const sc = worldToSacreCoeurLocal(x, z);
    if (sc.lx > -165 && sc.lx < 115 && sc.lz > -105 && sc.lz < 255) {
      if (y > 148 && Math.hypot(sc.lx, sc.lz) < 28) return 'Sacré-Cœur • Belvédère du Grand Dôme (83 m)';
      if (y < 145 && ((Math.abs(sc.lx) < 16.5 && sc.lz > -36 && sc.lz < 33) || (Math.abs(sc.lx) < 25 && Math.abs(sc.lz) < 12.5))) {
        if (sc.lz < -12) return 'Sacré-Cœur • Chœur & Mosaïque d’Or (475 m²)';
        if (sc.lz > 18) return 'Sacré-Cœur • Nef & Grand Orgue Cavaillé-Coll';
        return 'Sacré-Cœur • Croisée sous la Coupole (55 m)';
      }
      if (sc.lx < -76 && sc.lz > -30 && sc.lz < 52) return 'Montmartre • Place du Tertre & Saint-Pierre';
      if (sc.lx < -44 && sc.lz >= 62 && sc.lz <= 222) return 'Funiculaire de Montmartre & Rue Foyatier';
      if (sc.lz > 74) return 'Square Louise-Michel • Carrousel de Montmartre';
      if (sc.lz < -38) return 'Sacré-Cœur • Campanile de la Savoyarde (84 m)';
      return 'Parvis du Sacré-Cœur • Butte Montmartre';
    }

    // 2g. Secteur Le Panthéon & Place du Panthéon (+102, +26, +1913)
    const pan = worldToPantheonLocal(x, z);
    if (pan.lx > -135 && pan.lx < 125 && Math.abs(pan.lz) < 105) {
      if (y > PANTHEON_WORLD_POS.y + 42 && Math.hypot(pan.lx, pan.lz) < 24) return 'Le Panthéon • Colonnade Panoramique du Dôme (51,5 m)';
      if (y < PANTHEON_WORLD_POS.y + 40 && ((pan.lx >= -35 && pan.lx <= 46 && Math.abs(pan.lz) < 16) || (Math.abs(pan.lx) < 16 && Math.abs(pan.lz) < 40))) {
        if (pan.lx > 20) return 'Le Panthéon • Chœur, Convention Nationale & Crypte';
        if (Math.hypot(pan.lx, pan.lz) < 16) return 'Le Panthéon • Croisée & Pendule de Foucault';
        return 'Le Panthéon • Grande Nef Néoclassique';
      }
      if (pan.lz < -58 && pan.lx > -26 && pan.lx < 68) return 'Bibliothèque Sainte-Geneviève (Labrouste)';
      if (pan.lx > 60 && pan.lz < -25) return 'Église Saint-Étienne-du-Mont • Quartier Latin';
      if (pan.lx > 60 && pan.lz > 20) return 'Lycée Henri-IV & Tour Clovis';
      return 'Place du Panthéon • Montagne Sainte-Geneviève';
    }

    // 3. Proximité de la Seine ou des autres monuments
    if (distanceToPolyline(x, z, SEINE_POINTS) < 110 && y < 120) {
      return 'Paris • Rives de la Seine';
    }

    let closest = null;
    let minD = 320;
    for (let i = 0; i < MONUMENTS.length; i++) {
      const m = MONUMENTS[i];
      const d = Math.hypot(x - m.pos.x, z - m.pos.z);
      if (d < minD) {
        minD = d;
        closest = m;
      }
    }
    if (closest) return `Survol • ${closest.shortName}`;
    return 'Paris 3D • Vue aérienne';
  }

  function onKeyDown(e) {
    if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

    const k = e.key.toLowerCase();
    if (k === 'c' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      toggleMode();
      return;
    }

    if (['z', 'w', 'q', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k)) {
      state.keys.add(k);
      if (state.mode === 'fps' && state.flyAnim) {
        state.flyAnim = null;
      }
    }
  }

  function onKeyUp(e) {
    state.keys.delete(e.key.toLowerCase());
  }

  function onBlur() {
    state.keys.clear();
    state.isDraggingLook = false;
  }

  let pointerDownX = 0;
  let pointerDownY = 0;
  let movedDistance = 0;

  function onPointerDown(e) {
    if (e.button !== 0) return;
    pointerDownX = e.clientX;
    pointerDownY = e.clientY;
    movedDistance = 0;

    if (state.mode === 'fps' && !pointerLock.isLocked) {
      state.isDraggingLook = true;
      state.lastPointerX = e.clientX;
      state.lastPointerY = e.clientY;
    }
    if (state.flyAnim) state.flyAnim = null;
    if (state.orbit360) state.orbit360 = null;
  }

  function onPointerMove(e) {
    if (state.isDraggingLook && state.mode === 'fps' && !pointerLock.isLocked) {
      const dx = e.clientX - state.lastPointerX;
      const dy = e.clientY - state.lastPointerY;
      state.lastPointerX = e.clientX;
      state.lastPointerY = e.clientY;
      movedDistance += Math.abs(dx) + Math.abs(dy);

      state.yaw -= dx * 0.0034;
      state.pitch = THREE.MathUtils.clamp(state.pitch - dy * 0.003, -Math.PI * 0.44, Math.PI * 0.46);
      applyFpsAngles();
    } else if (e.buttons & 1) {
      movedDistance += Math.abs(e.clientX - pointerDownX) + Math.abs(e.clientY - pointerDownY);
    }
  }

  function onPointerUp() {
    state.isDraggingLook = false;
  }

  pointerLock.addEventListener('lock', () => {
    syncAnglesFromCamera();
    onPointerLockChange(true);
  });
  pointerLock.addEventListener('unlock', () => {
    syncAnglesFromCamera();
    onPointerLockChange(false);
  });

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  domElement.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);

  function wasDragGesture() {
    return movedDistance > 7;
  }

  function update(dt) {
    const clampedDt = Math.min(dt, 0.05);

    if (state.orbit360) {
      const o = state.orbit360;
      if (!o.paused) {
        o.elapsed += clampedDt;
      }
      const angle = o.startAngle - (o.elapsed / o.duration) * Math.PI * 2;
      const targetPos = new THREE.Vector3(
        o.center.x + Math.cos(angle) * o.rx,
        o.baseHeight + Math.sin(angle * 2) * (o.baseHeight > 80 ? 18 : 4.5),
        o.center.z + Math.sin(angle) * o.rz
      );
      const blendRaw = Math.min(1, o.elapsed / 1.8);
      const blend = blendRaw * blendRaw * (3 - 2 * blendRaw);

      camera.position.lerpVectors(o.startPos, targetPos, blend);
      lookTargetVec.lerpVectors(o.startLook, o.center, blend);
      camera.lookAt(lookTargetVec);
      orbit.target.copy(lookTargetVec);
      return;
    }

    if (state.flyAnim) {
      const anim = state.flyAnim;
      anim.elapsed += clampedDt;
      const rawT = Math.min(1, anim.elapsed / anim.duration);
      const t = rawT < 0.5 ? 4 * rawT * rawT * rawT : 1 - Math.pow(-2 * rawT + 2, 3) / 2;

      camera.position.lerpVectors(anim.startPos, anim.endPos, t);
      if (anim.arcHeight > 0) {
        camera.position.y += Math.sin(Math.PI * rawT) * anim.arcHeight;
      }
      lookTargetVec.lerpVectors(anim.startLook, anim.endLook, t);
      camera.lookAt(lookTargetVec);

      if (state.mode === 'orbit') {
        orbit.target.copy(lookTargetVec);
      } else {
        syncAnglesFromCamera();
      }

      if (rawT >= 1) {
        const doneCb = anim.onComplete;
        state.flyAnim = null;
        if (state.mode === 'orbit') {
          orbit.target.copy(anim.endLook);
          orbit.update();
          const minCamY = Math.max(getParisElevation(camera.position.x, camera.position.z), 0) + 1.6;
          if (camera.position.y < minCamY) camera.position.y = minCamY;
        } else {
          syncAnglesFromCamera();
        }
        if (doneCb) doneCb();
      }
      return;
    }

    if (state.mode === 'orbit') {
      const moveF = (state.keys.has('z') || state.keys.has('w') || state.keys.has('arrowup') ? 1 : 0)
        - (state.keys.has('s') || state.keys.has('arrowdown') ? 1 : 0);
      const moveR = (state.keys.has('d') || state.keys.has('arrowright') ? 1 : 0)
        - (state.keys.has('q') || state.keys.has('a') || state.keys.has('arrowleft') ? 1 : 0);

      if (moveF !== 0 || moveR !== 0) {
        camera.getWorldDirection(forwardVec);
        forwardVec.y = 0;
        if (forwardVec.lengthSq() < 1e-6) forwardVec.set(1, 0, 0);
        forwardVec.normalize();
        rightVec.crossVectors(forwardVec, camera.up).normalize();
        moveVec.set(0, 0, 0).addScaledVector(forwardVec, moveF).addScaledVector(rightVec, moveR).normalize();
        const baseAerialSpeed = THREE.MathUtils.clamp(camera.position.y * 0.9, 32, 220);
        const speed = state.keys.has('shift') ? baseAerialSpeed * 1.8 : baseAerialSpeed;
        camera.position.addScaledVector(moveVec, speed * clampedDt);
        orbit.target.addScaledVector(moveVec, speed * clampedDt);
      }
      orbit.update();
      const minCamY = Math.max(getParisElevation(camera.position.x, camera.position.z), 0) + 1.6;
      if (camera.position.y < minCamY) camera.position.y = minCamY;
      return;
    }

    const moveF = (state.keys.has('z') || state.keys.has('w') || state.keys.has('arrowup') ? 1 : 0)
      - (state.keys.has('s') || state.keys.has('arrowdown') ? 1 : 0);
    const moveR = (state.keys.has('d') || state.keys.has('arrowright') ? 1 : 0)
      - (state.keys.has('q') || state.keys.has('a') || state.keys.has('arrowleft') ? 1 : 0);

    if (moveF !== 0 || moveR !== 0) {
      camera.getWorldDirection(forwardVec);
      forwardVec.y = 0;
      if (forwardVec.lengthSq() < 1e-6) forwardVec.set(1, 0, 0);
      forwardVec.normalize();

      rightVec.crossVectors(forwardVec, camera.up).normalize();
      moveVec.set(0, 0, 0);
      moveVec.addScaledVector(forwardVec, moveF);
      moveVec.addScaledVector(rightVec, moveR);
      moveVec.normalize();

      const speed = state.keys.has('shift') ? SPRINT_SPEED : WALK_SPEED;
      camera.position.addScaledVector(moveVec, speed * clampedDt);
      resolveCollisions(camera.position);
    }

    const targetEyeY = context.getFloorHeightAt(camera.position.x, camera.position.z, camera.position.y) + EYE_HEIGHT;
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetEyeY, Math.min(1, clampedDt * 12));
  }

  return {
    state,
    orbit,
    pointerLock,
    setActiveMonumentContext,
    setMode,
    toggleMode,
    requestPointerLock,
    enterFpsAt,
    flyTo,
    flyArcTo,
    startOrbit360,
    setOrbit360Paused,
    cancelFlight,
    getZoneName,
    wasDragGesture,
    update,
  };
}
