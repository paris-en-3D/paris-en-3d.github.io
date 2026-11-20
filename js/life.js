import * as THREE from 'three';
import { mergeStaticGroupByMaterial } from './perf-manager.js';
import { getParisElevation } from './paris-data.js';
import { champsLocalToWorld } from './monuments/champs-elysees.js';
import { GARNIER_WORLD_POS, GARNIER_ROT_Y } from './monuments/palais-garnier.js';
import { NOTRE_DAME_WORLD_POS, NOTRE_DAME_ROT_Y } from './monuments/notre-dame.js';
import { SACRE_COEUR_WORLD_POS, SACRE_COEUR_ROT_Y } from './monuments/sacre-coeur.js';
import { PANTHEON_WORLD_POS, PANTHEON_ROT_Y } from './monuments/pantheon.js';

/**
 * ============================================================================
 * VIE PARISIENNE — QUARTIER DES HALLES & SECTEUR TOUR EIFFEL / TROCADÉRO
 * Passants animés, visiteurs, bus RATP, taxis, Vélib' (phares nocturnes) & oiseaux.
 * ============================================================================
 */

function lerpAngle(a, b, t) {
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

export function createLivingWorld(scene) {
  const lifeRoot = new THREE.Group();
  lifeRoot.name = 'VieParisienne';
  scene.add(lifeRoot);

  const eustacheLifeGroup = new THREE.Group();
  lifeRoot.add(eustacheLifeGroup);

  const eiffelLifeGroup = new THREE.Group();
  eiffelLifeGroup.position.set(-3694, 0, 556);
  eiffelLifeGroup.rotation.y = Math.atan2(136, 141);
  lifeRoot.add(eiffelLifeGroup);

  const arcLifeGroup = new THREE.Group();
  arcLifeGroup.position.set(-3658, 18, -1156);
  arcLifeGroup.rotation.y = Math.PI * 0.5 - Math.atan2(911, 1917);
  lifeRoot.add(arcLifeGroup);

  const garnierLifeGroup = new THREE.Group();
  garnierLifeGroup.position.copy(GARNIER_WORLD_POS);
  garnierLifeGroup.rotation.y = GARNIER_ROT_Y;
  garnierLifeGroup.visible = false;
  lifeRoot.add(garnierLifeGroup);

  const notreDameLifeGroup = new THREE.Group();
  notreDameLifeGroup.position.copy(NOTRE_DAME_WORLD_POS);
  notreDameLifeGroup.rotation.y = NOTRE_DAME_ROT_Y;
  notreDameLifeGroup.visible = false;
  lifeRoot.add(notreDameLifeGroup);

  const sacreCoeurLifeGroup = new THREE.Group();
  sacreCoeurLifeGroup.position.copy(SACRE_COEUR_WORLD_POS);
  sacreCoeurLifeGroup.rotation.y = SACRE_COEUR_ROT_Y;
  sacreCoeurLifeGroup.visible = false;
  lifeRoot.add(sacreCoeurLifeGroup);

  const pantheonLifeGroup = new THREE.Group();
  pantheonLifeGroup.position.copy(PANTHEON_WORLD_POS);
  pantheonLifeGroup.rotation.y = PANTHEON_ROT_Y;
  pantheonLifeGroup.visible = false;
  lifeRoot.add(pantheonLifeGroup);

  // Palettes couleurs (utilisées via InstancedMesh.setColorAt -> 1 seul matériau partagé !)
  const skinColors = [0xefd0b4, 0xd9a882, 0x8d5b3e];
  const hairColors = [0x221d1a, 0x5c3c24, 0x9c7b56, 0xc9c6c0];
  const coatColors = [0x25354d, 0xc2ab87, 0x6b222e, 0x3b4d3b, 0x2e3138, 0x8f5b38, 0x4c3f59];
  const pantsColors = [0x222630, 0x363b45, 0x3e352d];

  const matInstCloth = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.84 });
  const matVelib = new THREE.MeshStandardMaterial({ color: 0x20b59c, roughness: 0.4, metalness: 0.35 });
  const matVelibSkin = new THREE.MeshStandardMaterial({ color: skinColors[0], roughness: 0.78 });
  const matVelibCoat = new THREE.MeshStandardMaterial({ color: coatColors[0], roughness: 0.82 });
  const matBusWhite = new THREE.MeshStandardMaterial({ color: 0xf0f2f0, roughness: 0.38, metalness: 0.15 });
  const matBusJade = new THREE.MeshStandardMaterial({ color: 0x00a88f, roughness: 0.35, metalness: 0.18 });
  const matWheel = new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.88 });
  const matCarGlass = new THREE.MeshStandardMaterial({ color: 0x2b3e50, roughness: 0.18, metalness: 0.65 });
  const matHeadlight = new THREE.MeshStandardMaterial({
    color: 0xfff7dc,
    emissive: new THREE.Color(0xffe7a8),
    emissiveIntensity: 0.2,
    roughness: 0.2,
  });
  const matTaillight = new THREE.MeshStandardMaterial({
    color: 0xc92222,
    emissive: new THREE.Color(0xff2626),
    emissiveIntensity: 0.2,
    roughness: 0.25,
  });
  const matTaxiSign = new THREE.MeshStandardMaterial({
    color: 0x38d974,
    emissive: new THREE.Color(0x28e06c),
    emissiveIntensity: 0.65,
    roughness: 0.3,
  });
  const matHeadlightBeam = new THREE.MeshBasicMaterial({
    color: 0xfff0c2,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const geoHead = new THREE.SphereGeometry(0.135, 10, 8);
  const geoHair = new THREE.SphereGeometry(0.145, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.58);
  const geoTorso = new THREE.CylinderGeometry(0.16, 0.21, 0.68, 8);
  const geoLeg = new THREE.CapsuleGeometry(0.065, 0.56, 4, 6);
  const geoArm = new THREE.CapsuleGeometry(0.048, 0.44, 4, 6);
  const geoUnitWheel = new THREE.CylinderGeometry(1, 1, 1, 10);
  geoUnitWheel.rotateZ(Math.PI * 0.5);

  function createPedestrianRig(seed, parentGroup) {
    const g = new THREE.Group();
    const scale = 0.92 + ((seed * 37) % 16) * 0.01;
    g.scale.setScalar(scale);

    const bodyRoot = new THREE.Group();
    g.add(bodyRoot);

    const leftLegPivot = new THREE.Group();
    leftLegPivot.position.set(-0.09, 0.72, 0);
    const leftLegNode = new THREE.Object3D();
    leftLegNode.position.y = -0.34;
    leftLegPivot.add(leftLegNode);
    bodyRoot.add(leftLegPivot);

    const rightLegPivot = new THREE.Group();
    rightLegPivot.position.set(0.09, 0.72, 0);
    const rightLegNode = new THREE.Object3D();
    rightLegNode.position.y = -0.34;
    rightLegPivot.add(rightLegNode);
    bodyRoot.add(rightLegPivot);

    const torsoNode = new THREE.Object3D();
    torsoNode.position.y = 1.06;
    bodyRoot.add(torsoNode);

    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(-0.22, 1.32, 0);
    const leftArmNode = new THREE.Object3D();
    leftArmNode.position.y = -0.24;
    leftArmPivot.add(leftArmNode);
    bodyRoot.add(leftArmPivot);

    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.22, 1.32, 0);
    const rightArmNode = new THREE.Object3D();
    rightArmNode.position.y = -0.24;
    rightArmPivot.add(rightArmNode);
    bodyRoot.add(rightArmPivot);

    const headNode = new THREE.Object3D();
    headNode.position.y = 1.56;
    bodyRoot.add(headNode);

    const hairNode = new THREE.Object3D();
    hairNode.position.y = 1.58;
    bodyRoot.add(hairNode);

    parentGroup.add(g);
    return {
      g,
      bodyRoot,
      leftLegPivot,
      rightLegPivot,
      leftArmPivot,
      rightArmPivot,
      leftLegNode,
      rightLegNode,
      torsoNode,
      leftArmNode,
      rightArmNode,
      headNode,
      hairNode,
      skinHex: skinColors[seed % skinColors.length],
      hairHex: hairColors[(seed * 3) % hairColors.length],
      coatHex: coatColors[(seed * 5) % coatColors.length],
      pantsHex: pantsColors[(seed * 2) % pantsColors.length],
    };
  }

  const headlightBeams = [];

  function createVehicleMesh({ type = 'sedan', bodyColor = 0x2b3e55, parentGroup }) {
    const g = new THREE.Group();
    const wheels = [];

    if (type === 'bus') {
      const bodyLower = new THREE.Mesh(new THREE.BoxGeometry(2.45, 1.05, 10.6), matBusJade);
      bodyLower.position.y = 0.85;
      g.add(bodyLower);

      const bodyUpper = new THREE.Mesh(new THREE.BoxGeometry(2.42, 1.55, 10.4), matBusWhite);
      bodyUpper.position.y = 2.15;
      g.add(bodyUpper);

      const windows = new THREE.Mesh(new THREE.BoxGeometry(2.48, 1.05, 9.6), matCarGlass);
      windows.position.y = 2.12;
      g.add(windows);

      const dest = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.24, 0.1), matHeadlight);
      dest.position.set(0, 2.75, 5.22);
      g.add(dest);

      [-0.85, 0.85].forEach((lx) => {
        const hl = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.1), matHeadlight);
        hl.position.set(lx, 0.82, 5.32);
        g.add(hl);
        const tl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.1), matTaillight);
        tl.position.set(lx, 0.92, -5.32);
        g.add(tl);
      });

      const beam = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 8.5), matHeadlightBeam);
      beam.rotation.x = -Math.PI * 0.5;
      beam.position.set(0, 0.1, 9.5);
      beam.userData.noMerge = true;
      beam.visible = false;
      headlightBeams.push(beam);
      g.add(beam);

      [[-1.18, 3.2], [1.18, 3.2], [-1.18, -3.2], [1.18, -3.2]].forEach(([wx, wz]) => {
        const w = new THREE.Object3D();
        w.position.set(wx, 0.48, wz);
        w.scale.set(0.34, 0.48, 0.48);
        g.add(w);
        wheels.push(w);
      });
    } else if (type === 'velib') {
      [0.58, -0.58].forEach((wz) => {
        const w = new THREE.Object3D();
        w.position.set(0, 0.34, wz);
        w.scale.set(0.09, 0.32, 0.32);
        g.add(w);
        wheels.push(w);
      });
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 1.1), matVelib);
      frame.position.set(0, 0.62, 0);
      g.add(frame);
      const riderBody = new THREE.Mesh(geoTorso, matVelibCoat);
      riderBody.position.set(0, 1.18, -0.05);
      riderBody.rotation.x = 0.25;
      g.add(riderBody);
      const riderHead = new THREE.Mesh(geoHead, matVelibSkin);
      riderHead.position.set(0, 1.62, 0.08);
      g.add(riderHead);
    } else {
      const matBody = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.34, metalness: 0.45 });
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.68, 4.3), matBody);
      chassis.position.y = 0.62;
      g.add(chassis);

      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.58, 2.25), matBody);
      cabin.position.set(0, 1.22, -0.18);
      g.add(cabin);

      const glassBand = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.44, 2.05), matCarGlass);
      glassBand.position.set(0, 1.2, -0.18);
      g.add(glassBand);

      if (type === 'taxi') {
        const sign = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.16, 0.22), matTaxiSign);
        sign.position.set(0, 1.58, -0.1);
        g.add(sign);
      }

      [-0.64, 0.64].forEach((lx) => {
        const hl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.08), matHeadlight);
        hl.position.set(lx, 0.68, 2.16);
        g.add(hl);
        const tl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.08), matTaillight);
        tl.position.set(lx, 0.7, -2.16);
        g.add(tl);
      });

      const beam = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 6.2), matHeadlightBeam);
      beam.rotation.x = -Math.PI * 0.5;
      beam.position.set(0, 0.09, 5.2);
      beam.userData.noMerge = true;
      beam.visible = false;
      headlightBeams.push(beam);
      g.add(beam);

      [[-0.92, 1.32], [0.92, 1.32], [-0.92, -1.32], [0.92, -1.32]].forEach(([wx, wz]) => {
        const w = new THREE.Object3D();
        w.position.set(wx, 0.33, wz);
        w.scale.set(0.24, 0.33, 0.33);
        g.add(w);
        wheels.push(w);
      });
    }

    mergeStaticGroupByMaterial(g);
    parentGroup.add(g);
    return { g, wheels };
  }

  // Oiseaux partagés
  const matBirdWing = new THREE.MeshStandardMaterial({ color: 0x6f7680, roughness: 0.72, side: THREE.DoubleSide });
  const geoBirdBody = new THREE.ConeGeometry(0.11, 0.52, 6);
  geoBirdBody.rotateX(Math.PI * 0.5);
  const geoWing = new THREE.BufferGeometry();
  geoWing.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0.14, 0.58, 0.04, -0.02, 0, 0, -0.18]), 3));
  geoWing.computeVertexNormals();

  // Helper pour créer un système de vie instancié haute performance par secteur
  function createSectorLife({ parentGroup, pedRoutes, vehicleSpecs, birdFlocks }) {
    const pedestrians = [];
    const vehicles = [];
    const allWheels = [];
    const flyingBirds = [];

    pedRoutes.forEach((route, idx) => {
      const parts = createPedestrianRig(idx + 1, parentGroup);
      const startSeg = idx % route.pts.length;
      const nextSeg = (startSeg + 1) % route.pts.length;
      const p0 = route.pts[startSeg];
      const p1 = route.pts[nextSeg];
      const t0 = (idx * 0.37) % 1;
      const x = THREE.MathUtils.lerp(p0[0], p1[0], t0);
      const z = THREE.MathUtils.lerp(p0[1], p1[1], t0);
      const yaw = Math.atan2(p1[0] - p0[0], p1[1] - p0[1]);

      parts.g.position.set(x, route.y, z);
      parts.g.rotation.y = yaw;
      pedestrians.push({ ...parts, route, segIdx: startSeg, t: t0, yaw, walkPhase: idx * 1.7 });
    });

    vehicleSpecs.forEach((spec) => {
      const { g, wheels } = createVehicleMesh({ type: spec.type, bodyColor: spec.color, parentGroup });
      g.rotation.order = 'YXZ';
      if (spec.orbitR) {
        const ang = spec.start;
        const vy = spec.y ?? 0.23;
        g.position.set(Math.cos(ang) * spec.orbitR, vy, Math.sin(ang) * spec.orbitR);
        const dx = -Math.sin(ang) * spec.dir;
        const dz = Math.cos(ang) * spec.dir;
        g.rotation.y = Math.atan2(dx, dz);
        vehicles.push({ g, wheels, spec, pos: spec.start, angle: ang });
      } else {
        const vy = spec.yFn ? spec.yFn(spec.start) : (spec.y ?? 0.06);
        if (spec.axis === 'x') {
          g.position.set(spec.start, vy, spec.fixed);
          g.rotation.y = spec.dir > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
        } else {
          g.position.set(spec.fixed, vy, spec.start);
          g.rotation.y = spec.dir > 0 ? 0 : Math.PI;
        }
        if (spec.yFn) {
          g.rotation.x = -Math.atan((spec.yFn(spec.start + spec.dir) - spec.yFn(spec.start - spec.dir)) * 0.5);
        }
        vehicles.push({ g, wheels, spec, pos: spec.start });
      }
      wheels.forEach((w) => allWheels.push(w));
    });

    birdFlocks.forEach((flock, fIdx) => {
      for (let i = 0; i < flock.count; i++) {
        const bird = new THREE.Group();
        const leftWing = new THREE.Object3D();
        leftWing.scale.x = -1;
        bird.add(leftWing);
        const rightWing = new THREE.Object3D();
        bird.add(rightWing);
        bird.scale.setScalar(0.95 + (i % 3) * 0.18);
        parentGroup.add(bird);

        flyingBirds.push({
          bird,
          leftWing,
          rightWing,
          flock,
          colorHex: fIdx === 1 ? 0xe6e4df : 0x7b838d,
          angle: (i / flock.count) * Math.PI * 2 + fIdx * 1.1,
          radOffset: ((i % 3) - 1) * 5.0,
          yOffset: ((i % 4) - 1.5) * 2.8,
          flapPhase: i * 1.3 + fIdx * 2.0,
          flapSpeed: 6.8 + (i % 3) * 1.2,
        });
      }
    });

    // InstancedMesh partagés par secteur (8 draw calls max au lieu de ~170 !)
    const pedCount = Math.max(1, pedestrians.length);
    const headsInst = new THREE.InstancedMesh(geoHead, matInstCloth, pedCount);
    const hairsInst = new THREE.InstancedMesh(geoHair, matInstCloth, pedCount);
    const torsosInst = new THREE.InstancedMesh(geoTorso, matInstCloth, pedCount);
    const legsInst = new THREE.InstancedMesh(geoLeg, matInstCloth, pedCount * 2);
    const armsInst = new THREE.InstancedMesh(geoArm, matInstCloth, pedCount * 2);
    const wheelsInst = new THREE.InstancedMesh(geoUnitWheel, matWheel, Math.max(1, allWheels.length));
    const birdCount = Math.max(1, flyingBirds.length);
    const birdBodiesInst = new THREE.InstancedMesh(geoBirdBody, matInstCloth, birdCount);
    const birdWingsInst = new THREE.InstancedMesh(geoWing, matBirdWing, birdCount * 2);

    [headsInst, hairsInst, torsosInst, legsInst, armsInst, wheelsInst, birdBodiesInst, birdWingsInst].forEach((inst) => {
      inst.frustumCulled = false;
      parentGroup.add(inst);
    });

    const tmpColor = new THREE.Color();
    pedestrians.forEach((p, i) => {
      tmpColor.setHex(p.skinHex);
      headsInst.setColorAt(i, tmpColor);
      tmpColor.setHex(p.hairHex);
      hairsInst.setColorAt(i, tmpColor);
      tmpColor.setHex(p.coatHex);
      torsosInst.setColorAt(i, tmpColor);
      armsInst.setColorAt(i * 2, tmpColor);
      armsInst.setColorAt(i * 2 + 1, tmpColor);
      tmpColor.setHex(p.pantsHex);
      legsInst.setColorAt(i * 2, tmpColor);
      legsInst.setColorAt(i * 2 + 1, tmpColor);
    });
    if (headsInst.instanceColor) headsInst.instanceColor.needsUpdate = true;
    if (hairsInst.instanceColor) hairsInst.instanceColor.needsUpdate = true;
    if (torsosInst.instanceColor) torsosInst.instanceColor.needsUpdate = true;
    if (legsInst.instanceColor) legsInst.instanceColor.needsUpdate = true;
    if (armsInst.instanceColor) armsInst.instanceColor.needsUpdate = true;

    flyingBirds.forEach((fb, i) => {
      tmpColor.setHex(fb.colorHex);
      birdBodiesInst.setColorAt(i, tmpColor);
    });
    if (birdBodiesInst.instanceColor) birdBodiesInst.instanceColor.needsUpdate = true;

    const invParent = new THREE.Matrix4();
    const tmpMat = new THREE.Matrix4();

    function updateSector(dt, elapsed) {
      for (let i = 0; i < pedestrians.length; i++) {
        const p = pedestrians[i];
        const pts = p.route.pts;
        const a = pts[p.segIdx];
        const b = pts[(p.segIdx + 1) % pts.length];
        const segLen = Math.max(0.01, Math.hypot(b[0] - a[0], b[1] - a[1]));

        p.t += (p.route.speed * dt) / segLen;
        if (p.t >= 1) {
          p.t -= 1;
          p.segIdx = (p.segIdx + 1) % pts.length;
        }
        const curA = pts[p.segIdx];
        const curB = pts[(p.segIdx + 1) % pts.length];
        const nx = THREE.MathUtils.lerp(curA[0], curB[0], p.t);
        const nz = THREE.MathUtils.lerp(curA[1], curB[1], p.t);

        let floorY = p.route.yFn ? p.route.yFn(nx, nz) : p.route.y;
        if (p.route.isPortalWalker) {
          floorY = nx > -46.5 ? 0.40 : nx > -51.2 ? THREE.MathUtils.mapLinear(nx, -51.2, -46.5, 0.04, 0.40) : 0.04;
        }

        p.g.position.set(nx, floorY, nz);
        const targetYaw = Math.atan2(curB[0] - curA[0], curB[1] - curA[1]);
        p.yaw = lerpAngle(p.yaw, targetYaw, Math.min(1, dt * 8));
        p.g.rotation.y = p.yaw;

        p.walkPhase += dt * p.route.speed * 5.2;
        const swing = Math.sin(p.walkPhase) * 0.48;
        p.leftLegPivot.rotation.x = swing;
        p.rightLegPivot.rotation.x = -swing;
        p.leftArmPivot.rotation.x = -swing * 0.72;
        p.rightArmPivot.rotation.x = swing * 0.72;
        p.bodyRoot.position.y = Math.abs(Math.cos(p.walkPhase)) * 0.045;
      }

      for (let i = 0; i < vehicles.length; i++) {
        const v = vehicles[i];
        const s = v.spec;
        if (s.orbitR) {
          v.angle += ((s.dir * s.speed) / s.orbitR) * dt;
          const vy = s.y ?? 0.23;
          v.g.position.set(Math.cos(v.angle) * s.orbitR, vy, Math.sin(v.angle) * s.orbitR);
          const dx = -Math.sin(v.angle) * s.dir;
          const dz = Math.cos(v.angle) * s.dir;
          v.g.rotation.y = Math.atan2(dx, dz);
        } else {
          v.pos += s.dir * s.speed * dt;
          if (s.dir > 0 && v.pos > s.max) v.pos = s.min;
          if (s.dir < 0 && v.pos < s.min) v.pos = s.max;
          if (s.axis === 'x') v.g.position.x = v.pos;
          else v.g.position.z = v.pos;
          if (s.yFn) {
            v.g.position.y = s.yFn(v.pos);
            v.g.rotation.x = -Math.atan((s.yFn(v.pos + s.dir) - s.yFn(v.pos - s.dir)) * 0.5);
          }
        }
        const spin = s.speed * dt * 2.4;
        for (let w = 0; w < v.wheels.length; w++) v.wheels[w].rotation.x += spin;
      }

      for (let i = 0; i < flyingBirds.length; i++) {
        const fb = flyingBirds[i];
        const f = fb.flock;
        fb.angle += f.dir * f.speed * dt;
        const rx = f.rx + fb.radOffset;
        const rz = f.rz + fb.radOffset * 0.7;
        const x = f.cx + Math.cos(fb.angle) * rx;
        const z = f.cz + Math.sin(fb.angle) * rz;
        const y = f.baseY + fb.yOffset + Math.sin(fb.angle * 2.0 + fb.flapPhase) * 2.2;
        const dx = -Math.sin(fb.angle) * rx * f.dir;
        const dz = Math.cos(fb.angle) * rz * f.dir;
        fb.bird.position.set(x, y, z);
        fb.bird.rotation.y = Math.atan2(dx, dz);
        fb.bird.rotation.z = f.dir * -0.22;
        const glideCycle = Math.sin(elapsed * 0.8 + fb.flapPhase);
        const flapAmp = glideCycle > -0.15 ? 0.62 : 0.08;
        const wingAngle = Math.sin(elapsed * fb.flapSpeed + fb.flapPhase) * flapAmp;
        fb.leftWing.rotation.z = -wingAngle;
        fb.rightWing.rotation.z = wingAngle;
      }

      parentGroup.updateWorldMatrix(true, true);
      invParent.copy(parentGroup.matrixWorld).invert();

      for (let i = 0; i < pedestrians.length; i++) {
        const p = pedestrians[i];
        tmpMat.multiplyMatrices(invParent, p.headNode.matrixWorld);
        headsInst.setMatrixAt(i, tmpMat);
        tmpMat.multiplyMatrices(invParent, p.hairNode.matrixWorld);
        hairsInst.setMatrixAt(i, tmpMat);
        tmpMat.multiplyMatrices(invParent, p.torsoNode.matrixWorld);
        torsosInst.setMatrixAt(i, tmpMat);
        tmpMat.multiplyMatrices(invParent, p.leftLegNode.matrixWorld);
        legsInst.setMatrixAt(i * 2, tmpMat);
        tmpMat.multiplyMatrices(invParent, p.rightLegNode.matrixWorld);
        legsInst.setMatrixAt(i * 2 + 1, tmpMat);
        tmpMat.multiplyMatrices(invParent, p.leftArmNode.matrixWorld);
        armsInst.setMatrixAt(i * 2, tmpMat);
        tmpMat.multiplyMatrices(invParent, p.rightArmNode.matrixWorld);
        armsInst.setMatrixAt(i * 2 + 1, tmpMat);
      }
      headsInst.instanceMatrix.needsUpdate = true;
      hairsInst.instanceMatrix.needsUpdate = true;
      torsosInst.instanceMatrix.needsUpdate = true;
      legsInst.instanceMatrix.needsUpdate = true;
      armsInst.instanceMatrix.needsUpdate = true;

      for (let w = 0; w < allWheels.length; w++) {
        tmpMat.multiplyMatrices(invParent, allWheels[w].matrixWorld);
        wheelsInst.setMatrixAt(w, tmpMat);
      }
      wheelsInst.instanceMatrix.needsUpdate = true;

      for (let i = 0; i < flyingBirds.length; i++) {
        const fb = flyingBirds[i];
        tmpMat.multiplyMatrices(invParent, fb.bird.matrixWorld);
        birdBodiesInst.setMatrixAt(i, tmpMat);
        tmpMat.multiplyMatrices(invParent, fb.leftWing.matrixWorld);
        birdWingsInst.setMatrixAt(i * 2, tmpMat);
        tmpMat.multiplyMatrices(invParent, fb.rightWing.matrixWorld);
        birdWingsInst.setMatrixAt(i * 2 + 1, tmpMat);
      }
      birdBodiesInst.instanceMatrix.needsUpdate = true;
      birdWingsInst.instanceMatrix.needsUpdate = true;
    }

    updateSector(0, 0);
    return updateSector;
  }

  // --- SECTEUR 1 : SAINT-EUSTACHE / LES HALLES ---
  const updateEustacheLife = createSectorLife({
    parentGroup: eustacheLifeGroup,
    pedRoutes: [
      { y: 0.04, speed: 1.45, pts: [[-57, -20], [-57, 22], [-64, 22], [-64, -20]] },
      { y: 0.04, speed: 1.35, pts: [[-63, 18], [-63, -24], [-55, -24], [-55, 18]] },
      { y: 0.04, speed: 1.4, pts: [[-54, 28], [-38, 28], [-38, 35], [-54, 35]] },
      { y: 0.04, speed: 1.5, pts: [[-36, 29], [14, 29], [14, 34], [-36, 34]] },
      { y: 0.06, speed: 1.45, pts: [[0.2, 34], [0.2, 54], [-1.0, 63], [0.2, 74], [0.2, 90], [7.8, 90], [7.8, 74], [9.0, 63], [7.8, 54], [7.8, 34]] },
      { y: 0.06, speed: 1.5, pts: [[-48, 62], [-8, 62], [-8, 66], [-48, 66]] },
      { y: 0.06, speed: 1.6, pts: [[16, 34], [16, 42], [28, 42], [28, 34]] },
      { y: 0.04, speed: 1.5, pts: [[-48, -28], [46, -28], [46, -25], [-48, -25]] },
      { y: 0.40, speed: 0.92, pts: [[-40, -1.2], [-4, -1.2], [-4, 1.2], [-40, 1.2]] },
      { y: 0.40, speed: 0.88, pts: [[-36, -9.2], [-4, -9.2], [-4, -10.5], [-36, -10.5]] },
      { y: 0.40, speed: 0.85, pts: [[14, -9.2], [28, -9.2], [38, -3.0], [42, 0], [38, 3.0], [28, 9.2], [14, 9.2], [14, -9.2]] },
      { y: 0.04, speed: 1.1, isPortalWalker: true, pts: [[-56, 0.8], [-32, 0.8], [-32, -0.8], [-56, -0.8]] },
    ],
    vehicleSpecs: [
      { type: 'bus',   axis: 'x', fixed: -33.6, dir: 1,  min: -68, max: 68, start: -28, speed: 6.4 },
      { type: 'taxi',  axis: 'x', fixed: -38.4, dir: -1, min: -68, max: 68, start: 42,  speed: 9.2, color: 0x1c222b },
      { type: 'sedan', axis: 'x', fixed: -33.6, dir: 1,  min: -68, max: 68, start: 26,  speed: 8.6, color: 0x6f242c },
      { type: 'velib', axis: 'x', fixed: -31.4, dir: 1,  min: -66, max: 66, start: -52, speed: 4.5 },
      { type: 'bus',   axis: 'z', fixed: -76.4, dir: 1,  min: -30, max: 92, start: -10, speed: 6.2 },
      { type: 'taxi',  axis: 'z', fixed: -71.6, dir: -1, min: -30, max: 92, start: 48,  speed: 8.8, color: 0x263242 },
      { type: 'sedan', axis: 'z', fixed: 69.6,  dir: 1,  min: -30, max: 94, start: 22,  speed: 9.5, color: 0x385075 },
    ],
    birdFlocks: [
      { cx: -28, cz: -4, rx: 34, rz: 24, baseY: 42, count: 6, speed: 0.26, dir: 1 },
      { cx: 6,   cz: 14, rx: 42, rz: 32, baseY: 50, count: 6, speed: 0.21, dir: -1 },
    ],
  });

  // --- SECTEUR 2 : TOUR EIFFEL, CHAMP-DE-MARS, PONT D'IÉNA & TROCADÉRO ---
  const updateEiffelLife = createSectorLife({
    parentGroup: eiffelLifeGroup,
    pedRoutes: [
      // Visiteurs sous les 4 grands arcs du parvis
      { y: 0.14, speed: 1.45, pts: [[-24, -24], [24, -24], [24, 24], [-24, 24]] },
      { y: 0.14, speed: 1.35, pts: [[20, 20], [-20, 20], [-20, -20], [20, -20]] },
      { y: 0.14, speed: 1.5, pts: [[-10, -78], [10, -78], [10, 78], [-10, 78]] },
      { y: 0.14, speed: 1.4, pts: [[8, 70], [-8, 70], [-8, -70], [8, -70]] },
      // Promeneurs sur le Champ-de-Mars
      { y: 0.12, speed: 1.45, pts: [[-42, 130], [-42, 380], [42, 380], [42, 130]] },
      { y: 0.12, speed: 1.5, pts: [[40, 350], [40, 140], [-40, 140], [-40, 350]] },
      // Traversée piétonne du Pont d'Iéna (cambrure douce z ∈ [-300, -140]) & Jardins du Trocadéro
      {
        y: 0.42,
        yFn: (_x, z) => 0.42 + 2.55 * Math.max(0, 1 - ((z + 220) / 80) ** 2),
        speed: 1.55,
        pts: [[-14.5, -140], [-14.5, -300], [14.5, -300], [14.5, -140]],
      },
      { y: 0.36, speed: 1.4, pts: [[-24, -374], [-24, -472], [-42, -472], [-42, -374]] },
      { y: 0.36, speed: 1.35, pts: [[24, -472], [24, -374], [42, -374], [42, -472]] },
    ],
    vehicleSpecs: [
      // Circulation sur le vrai Quai Branly Rive Gauche (z = -133,5, x ∈ [-210, +210])
      { type: 'bus',   axis: 'x', fixed: -130.5, y: 0.29, dir: 1,  min: -210, max: 210, start: -135, speed: 8.2 },
      { type: 'taxi',  axis: 'x', fixed: -136.5, y: 0.29, dir: -1, min: -210, max: 210, start: 115,  speed: 10.8, color: 0x1c222b },
      { type: 'sedan', axis: 'x', fixed: -130.5, y: 0.29, dir: 1,  min: -210, max: 210, start: 40,   speed: 10.2, color: 0x6f242c },
      { type: 'velib', axis: 'x', fixed: -127.8, y: 0.29, dir: 1,  min: -200, max: 200, start: -45,  speed: 5.0 },
      // Avenue de New-York Rive Droite (z = -306,5, x ∈ [-210, +210])
      { type: 'taxi',  axis: 'x', fixed: -303.5, y: 0.29, dir: 1,  min: -210, max: 210, start: -110, speed: 10.4, color: 0x1c222b },
      { type: 'sedan', axis: 'x', fixed: -309.5, y: 0.29, dir: -1, min: -210, max: 210, start: 95,   speed: 9.6,  color: 0x385075 },
      // Avenue de Suffren (x = -126) & Avenue de la Bourdonnais (x = +126) jusqu'au carrefour Quai Branly
      { type: 'bus',   axis: 'z', fixed: -123.5, y: 0.29, dir: 1,  min: -118, max: 738, start: 180,  speed: 7.4 },
      { type: 'taxi',  axis: 'z', fixed: -128.5, y: 0.29, dir: -1, min: -118, max: 738, start: 540,  speed: 10.6, color: 0x263242 },
      { type: 'sedan', axis: 'z', fixed: 123.5,  y: 0.29, dir: 1,  min: -118, max: 738, start: 320,  speed: 11.0, color: 0x385075 },
      { type: 'taxi',  axis: 'z', fixed: 128.5,  y: 0.29, dir: -1, min: -118, max: 738, start: 640,  speed: 9.8,  color: 0x1c222b },
      // Traversée du Pont d'Iéna (cambrure douce z ∈ [-298, -142])
      {
        type: 'taxi',
        axis: 'z',
        fixed: -4.2,
        yFn: (z) => 0.31 + 2.55 * Math.max(0, 1 - ((z + 220) / 80) ** 2),
        dir: 1,
        min: -298,
        max: -142,
        start: -245,
        speed: 9.4,
        color: 0x1c222b,
      },
      {
        type: 'sedan',
        axis: 'z',
        fixed: 4.2,
        yFn: (z) => 0.31 + 2.55 * Math.max(0, 1 - ((z + 220) / 80) ** 2),
        dir: -1,
        min: -298,
        max: -142,
        start: -175,
        speed: 9.8,
        color: 0x6f242c,
      },
    ],
    birdFlocks: [
      { cx: 0, cz: 0,    rx: 75, rz: 75, baseY: 92,  count: 7, speed: 0.22, dir: 1 },
      { cx: 0, cz: -221, rx: 90, rz: 65, baseY: 48,  count: 6, speed: 0.25, dir: -1 },
    ],
  });

  // --- C. VIE ANIMÉE SECTEUR ARC DE TRIOMPHE / PLACE DE L'ÉTOILE (-3658, +18, -1156) ---
  const updateArcLife = createSectorLife({
    parentGroup: arcLifeGroup,
    pedRoutes: [
      // Promenade large sur le parvis étoilé (hors piliers & trémies ±36)
      {
        y: 0.26,
        speed: 1.15,
        count: 6,
        pts: [[-28, 17], [28, 17], [31, 0], [28, -17], [-28, -17], [-31, 0]],
      },
      // Passants sous la Grande Voûte le long du Soldat Inconnu (côté Ouest/Nord)
      {
        y: 0.26,
        speed: 0.95,
        count: 4,
        pts: [[-4.8, -18], [-4.8, 18], [-34, 24], [-34, -24]],
      },
      // Passants sous la Grande Voûte (côté Est/Sud)
      {
        y: 0.26,
        speed: 1.05,
        count: 3,
        pts: [[4.8, 18], [4.8, -18], [34, -24], [34, 24]],
      },
      // Anneau extérieur du terre-plein central (devant les hauts-reliefs)
      {
        y: 0.26,
        speed: 1.1,
        count: 4,
        pts: [[-16, -24], [16, -24], [38, 0], [16, 24], [-16, 24], [-38, 0]],
      },
      // Visiteurs admirant Paris depuis la Terrasse Panoramique (50 m)
      {
        y: 49.56,
        speed: 0.85,
        count: 4,
        pts: [
          [-14, 5.2], [14, 5.2], [14, -5.2], [5.5, -5.2],
          [5.5, -1.2], [-5.5, -1.2], [-5.5, -5.2], [-14, -5.2],
        ],
      },
      // Flâneurs sur la contre-allée granit côté Sud (Publicis, Fouquet's, Louis Vuitton, Ladurée)
      {
        y: 0,
        yFn: (lx, lz) => {
          const w = champsLocalToWorld(lx, lz);
          return getParisElevation(w.x, w.z) + 0.28 - 18;
        },
        speed: 1.15,
        count: 5,
        pts: [[-21.5, 165], [-21.5, 560], [-25.5, 560], [-25.5, 165]],
      },
      // Flâneurs sur la contre-allée granit côté Nord (Champs-Élysées pairs)
      {
        y: 0,
        yFn: (lx, lz) => {
          const w = champsLocalToWorld(lx, lz);
          return getParisElevation(w.x, w.z) + 0.28 - 18;
        },
        speed: 1.18,
        count: 5,
        pts: [[21.5, 560], [21.5, 165], [25.5, 165], [25.5, 560]],
      },
    ],
    vehicleSpecs: [
      // Rond-point de l'Étoile (circulation anti-horaire dir = -1, priorité à droite, r ∈ [45,5..84])
      { type: 'taxi',  orbitR: 51, y: 0.23, dir: -1, start: 0.2, speed: 9.8,  color: 0x1c222b },
      { type: 'sedan', orbitR: 53, y: 0.23, dir: -1, start: 3.3, speed: 9.2,  color: 0x385075 },
      { type: 'taxi',  orbitR: 59, y: 0.23, dir: -1, start: 1.4, speed: 10.6, color: 0x263242 },
      { type: 'sedan', orbitR: 61, y: 0.23, dir: -1, start: 4.5, speed: 10.2, color: 0x6f242c },
      { type: 'bus',   orbitR: 67, y: 0.23, dir: -1, start: 0.8, speed: 7.4 },
      { type: 'sedan', orbitR: 69, y: 0.23, dir: -1, start: 3.9, speed: 10.8, color: 0x455a4a },
      { type: 'bus',   orbitR: 75, y: 0.23, dir: -1, start: 2.3, speed: 7.8 },
      { type: 'velib', orbitR: 77, y: 0.23, dir: -1, start: 5.2, speed: 5.2 },
    ],
    birdFlocks: [
      { cx: 0, cz: 0,  rx: 52, rz: 44, baseY: 59, count: 6, speed: 0.24, dir: 1 },
      { cx: 0, cz: 26, rx: 68, rz: 58, baseY: 38, count: 5, speed: 0.21, dir: -1 },
    ],
  });

  // --- SECTEUR 4 : PALAIS GARNIER & PLACE DE L'OPÉRA (-980, 0, -956) ---
  const garnierStairHeight = (_x, z) => {
    if (z <= 53 && z >= 40.5) return 1.4 + ((53.0 - z) / 12.5) * 4.2;
    if (z < 40.5 && z >= 37.2) return 5.6;
    if (z < 37.5 && z >= 23.5) return 5.6 + ((37.5 - z) / 13.5) * 4.9;
    return z > 82 ? 0.22 : 1.4;
  };
  const updateGarnierLife = createSectorLife({
    parentGroup: garnierLifeGroup,
    pedRoutes: [
      // Flâneurs sur le Parvis Place Charles-Garnier devant les arcades
      { y: 0.23, speed: 1.35, pts: [[-34, 94], [34, 94], [34, 118], [-34, 118]] },
      { y: 0.23, speed: 1.42, pts: [[28, 114], [-28, 114], [-28, 96], [28, 96]] },
      { y: 0.23, speed: 1.28, pts: [[-14, 91], [14, 91], [14, 121], [-14, 121]] },
      // Clients et promeneurs le long de la terrasse du Café de la Paix (Ouest)
      { y: 0.22, speed: 1.25, pts: [[-55, 96], [-55, 145], [-92, 145], [-92, 138], [-58, 138], [-58, 96]] },
      { y: 0.22, speed: 1.32, pts: [[-56, 142], [-56, 98], [-54, 98], [-54, 142]] },
      // Visiteurs autour des bouches du Métro Opéra (Place de l'Opéra)
      { y: 0.24, speed: 1.2, pts: [[-10, 132], [10, 132], [10, 144], [-10, 144]] },
      { y: 0.24, speed: 1.25, pts: [[8, 189], [-8, 189], [-8, 199], [8, 199]] },
      // Spectateurs montant et descendant le Grand Escalier d'Honneur
      { y: 1.4, yFn: garnierStairHeight, speed: 0.95, pts: [[-2.4, 54], [-2.4, 38.5], [-9.2, 24.5], [-6.2, 24.5], [-1.2, 38.5], [-1.2, 54]] },
      { y: 1.4, yFn: garnierStairHeight, speed: 1.0, pts: [[2.2, 25], [8.8, 25], [8.8, 38.5], [2.2, 53.5], [1.0, 53.5], [6.5, 38.5], [6.5, 25]] },
      // Promeneurs élégants dans le Grand Foyer Doré (y = 10,52 m)
      { y: 10.52, speed: 0.88, pts: [[-22, 66], [22, 66], [22, 71.5], [-22, 71.5]] },
      { y: 10.52, speed: 0.92, pts: [[18, 70.5], [-18, 70.5], [-18, 66.5], [18, 66.5]] },
    ],
    vehicleSpecs: [
      // Boulevard des Capucines -> Boulevard des Italiens traversant la Place de l'Opéra (lz = +155..+181)
      { type: 'bus',   axis: 'x', fixed: 156.5, y: 0.09, dir: 1,  min: -98, max: 98, start: -52, speed: 7.4 },
      { type: 'taxi',  axis: 'x', fixed: 162.5, y: 0.09, dir: 1,  min: -98, max: 98, start: 18,  speed: 10.4, color: 0x1c222b },
      { type: 'sedan', axis: 'x', fixed: 170.5, y: 0.09, dir: -1, min: -98, max: 98, start: 68,  speed: 10.8, color: 0x385075 },
      { type: 'bus',   axis: 'x', fixed: 177.5, y: 0.09, dir: -1, min: -98, max: 98, start: -18, speed: 7.2 },
      { type: 'velib', axis: 'x', fixed: 152.5, y: 0.09, dir: 1,  min: -95, max: 95, start: -80, speed: 4.8 },
      // Amorce de l'Avenue de l'Opéra (de part et d'autre de l'îlot Sud Métro Opéra à |lx| = 15 m)
      { type: 'taxi',  axis: 'z', fixed: -15.5, y: 0.09, dir: 1,  min: 155, max: 224, start: 172, speed: 9.8, color: 0x263242 },
      { type: 'sedan', axis: 'z', fixed: 15.5,  y: 0.09, dir: -1, min: 155, max: 224, start: 208, speed: 10.2, color: 0x6f242c },
    ],
    birdFlocks: [
      { cx: 0, cz: -8, rx: 46, rz: 42, baseY: 57, count: 6, speed: 0.22, dir: 1 },
      { cx: 0, cz: 62, rx: 52, rz: 36, baseY: 42, count: 5, speed: 0.25, dir: -1 },
    ],
  });

  // --- SECTEUR 5 : CATHÉDRALE NOTRE-DAME DE PARIS & ÎLE DE LA CITÉ (+358, +0.45, +1156) ---
  const updateNotreDameLife = createSectorLife({
    parentGroup: notreDameLifeGroup,
    pedRoutes: [
      // Visiteurs autour du Point Zéro & du Parvis devant les Portails
      { y: 0.14, speed: 1.25, pts: [[-118, -16], [-72, -16], [-72, 16], [-118, 16]] },
      { y: 0.14, speed: 1.32, pts: [[-68, 22], [-104, 22], [-104, -22], [-68, -22]] },
      { y: 0.14, speed: 1.18, pts: [[-140, -10], [-98, -10], [-98, 12], [-140, 12]] },
      // Visiteurs entrant par le Portail central dans la Grande Nef & Bas-côtés
      { y: 0.22, speed: 0.92, pts: [[-54, -1.5], [2, -1.5], [2, 1.5], [-54, 1.5]] },
      { y: 0.22, speed: 0.88, pts: [[-45, -10.2], [26, -10.2], [26, -15.8], [-45, -15.8]] },
      { y: 0.22, speed: 0.90, pts: [[26, 15.8], [-45, 15.8], [-45, 10.2], [26, 10.2]] },
      // Promeneurs au Square Jean-XXIII & Fontaines / Bouquinistes
      { y: 0.13, speed: 1.15, pts: [[68, -12], [116, -12], [116, 12], [68, 12]] },
      { y: 0.13, speed: 1.22, pts: [[-105, 68], [62, 68], [62, 62], [-105, 62]] },
    ],
    vehicleSpecs: [
      // Voitures / taxis traversant Petit-Pont & Pont d'Arcole (lx = -132)
      { type: 'taxi',  axis: 'z', fixed: -135.5, y: 1.85, dir: 1,  min: 74,   max: 152, start: 85,  speed: 8.6, color: 0x1c222b },
      { type: 'sedan', axis: 'z', fixed: -128.5, y: 1.85, dir: -1, min: 74,   max: 152, start: 132, speed: 9.2, color: 0x385075 },
      { type: 'bus',   axis: 'z', fixed: -135.0, y: 1.85, dir: 1,  min: -152, max: -74, start: -135, speed: 6.8 },
      { type: 'velib', axis: 'x', fixed: 31.5,   y: 0.12, dir: 1,  min: -140, max: 115, start: -60, speed: 4.9 },
    ],
    birdFlocks: [
      { cx: 11,  cz: 0, rx: 44, rz: 38, baseY: 78, count: 7, speed: 0.23, dir: 1 },
      { cx: -56, cz: 0, rx: 38, rz: 42, baseY: 56, count: 6, speed: 0.26, dir: -1 },
    ],
  });

  // --- SECTEUR 6 : BASILIQUE DU SACRÉ-CŒUR & VILLAGE DE MONTMARTRE (-139, +90, -2591) ---
  const scSlopeY = (lx, lz) => getParisElevation(SACRE_COEUR_WORLD_POS.x + lx, SACRE_COEUR_WORLD_POS.z + lz) - SACRE_COEUR_WORLD_POS.y + 1.85;
  const updateSacreCoeurLife = createSectorLife({
    parentGroup: sacreCoeurLifeGroup,
    pedRoutes: [
      // Flâneurs & photographes sur le grand Parvis panoramique devant le Triple Portique
      { y: 0.1, speed: 1.18, pts: [[-34, 52], [34, 52], [34, 68], [-34, 68]] },
      { y: 0.1, speed: 1.24, pts: [[26, 65], [-26, 65], [-26, 54], [26, 54]] },
      { y: 0.1, speed: 1.05, pts: [[-14, 50], [14, 50], [14, 69], [-14, 69]] },
      // Visiteurs dans la Grande Nef vers la Mosaïque d'Or du Christ
      { y: 2.53, speed: 0.85, pts: [[-1.6, 26], [-1.6, -12], [1.6, -12], [1.6, 26]] },
      { y: 2.53, speed: 0.82, pts: [[-10.5, 22], [-10.5, -6], [-12.5, -6], [-12.5, 22]] },
      // Promeneurs sur les terrasses du Square Louise-Michel
      { y: 0, yFn: scSlopeY, speed: 1.08, pts: [[-24, 96], [24, 96], [24, 102], [-24, 102]] },
      { y: 0, yFn: scSlopeY, speed: 1.12, pts: [[-28, 134], [28, 134], [28, 140], [-28, 140]] },
      { y: 0, yFn: (lx, lz) => getParisElevation(SACRE_COEUR_WORLD_POS.x + lx, SACRE_COEUR_WORLD_POS.z + lz) - SACRE_COEUR_WORLD_POS.y + 1.55, speed: 1.2, pts: [[-36, 214], [12, 214], [12, 224], [-36, 224]] },
      // Visiteurs & artistes déambulant sur la Place du Tertre (très animée !)
      { y: 0.1, speed: 1.05, count: 4, pts: [[-122, 0.5], [-96, 0.5], [-96, 27.5], [-122, 27.5]] },
      { y: 0.1, speed: 0.98, count: 4, pts: [[-98, 26.5], [-121, 26.5], [-121, 1.5], [-98, 1.5]] },
      { y: 0.28, speed: 0.85, count: 4, pts: [[-116, 7.5], [-104, 7.5], [-104, 20.5], [-116, 20.5]] },
    ],
    vehicleSpecs: [
      // Taxis & voitures passant en contrebas sur la Place Saint-Pierre / Rue Tardieu (lz = +232)
      { type: 'taxi',  axis: 'x', fixed: 230, y: getParisElevation(-139, -2591 + 230) - 90 + 1.48, dir: 1,  min: -60, max: 60, start: -42, speed: 7.4, color: 0x1c222b },
      { type: 'sedan', axis: 'x', fixed: 234, y: getParisElevation(-139, -2591 + 234) - 90 + 1.48, dir: -1, min: -60, max: 60, start: 35,  speed: 8.1, color: 0x6f242c },
    ],
    birdFlocks: [
      { cx: 0, cz: 0,  rx: 46, rz: 48, baseY: 84, count: 8, speed: 0.22, dir: 1 },
      { cx: 0, cz: 46, rx: 54, rz: 36, baseY: 54, count: 6, speed: 0.25, dir: -1 },
    ],
  });

  // --- SECTEUR 7 : LE PANTHÉON & PLACE DU PANTHÉON (+102, +26, +1913) ---
  const updatePantheonLife = createSectorLife({
    parentGroup: pantheonLifeGroup,
    pedRoutes: [
      // Étudiants & visiteurs sur la Place du Panthéon devant le Péristyle
      { y: 0.06, speed: 1.18, count: 3, pts: [[-66, -24], [-66, 24], [-86, 24], [-86, -24]] },
      { y: 0.06, speed: 1.12, count: 3, pts: [[-105, -16], [-64, -16], [-64, -36], [-105, -36]] },
      { y: 0.06, speed: 1.10, count: 3, pts: [[-105, 16], [-64, 16], [-64, 36], [-105, 36]] },
      // Visiteurs intérieurs admirant le Pendule de Foucault & les fresques de Puvis de Chavannes !
      { y: 2.42, speed: 0.78, count: 3, pts: [[-28, -5.5], [-8, -8.5], [14, -8.5], [14, 8.5], [-8, 8.5], [-28, 5.5]] },
      { y: 2.42, speed: 0.72, count: 2, pts: [[-8.5, -24], [8.5, -24], [8.5, -9], [-8.5, -9]] },
      { y: 2.42, speed: 0.72, count: 2, pts: [[-8.5, 9], [8.5, 9], [8.5, 24], [-8.5, 24]] },
    ],
    vehicleSpecs: [
      { type: 'bus',   axis: 'x', fixed: -56, y: 0.14, dir: 1,  min: -62, max: 58, start: -40, speed: 6.4 },
      { type: 'taxi',  axis: 'x', fixed: +56, y: 0.14, dir: -1, min: -62, max: 58, start: 34,  speed: 7.8, color: 0x1c222b },
      { type: 'sedan', axis: 'z', fixed: +66, y: 0.14, dir: 1,  min: -52, max: 52, start: -30, speed: 7.2, color: 0x385075 },
    ],
    birdFlocks: [
      { cx: 0, cz: 0, rx: 40, rz: 40, baseY: 86, count: 7, speed: 0.21, dir: 1 },
      { cx: -52, cz: 0, rx: 32, rz: 36, baseY: 46, count: 5, speed: 0.25, dir: -1 },
    ],
  });

  let elapsed = 0;

  function update(dt, nightFactor = 0.1, activeMonumentId = 'saint-eustache') {
    const clampedDt = Math.min(dt, 0.05);
    elapsed += clampedDt;

    const lightsOn = Math.max(0, (nightFactor - 0.22) / 0.78);
    matHeadlight.emissiveIntensity = 0.2 + lightsOn * 2.6;
    matTaillight.emissiveIntensity = 0.2 + lightsOn * 2.2;
    matHeadlightBeam.opacity = lightsOn * 0.22;
    const showBeams = lightsOn > 0.02;
    for (let i = 0; i < headlightBeams.length; i++) {
      headlightBeams[i].visible = showBeams;
    }

    if (!lifeRoot.visible) return;

    eustacheLifeGroup.visible =
      activeMonumentId !== 'tour-eiffel' &&
      activeMonumentId !== 'arc-de-triomphe' &&
      activeMonumentId !== 'palais-garnier' &&
      activeMonumentId !== 'notre-dame' &&
      activeMonumentId !== 'sacre-coeur' &&
      activeMonumentId !== 'pantheon';
    eiffelLifeGroup.visible = activeMonumentId === 'tour-eiffel';
    arcLifeGroup.visible = activeMonumentId === 'arc-de-triomphe';
    garnierLifeGroup.visible = activeMonumentId === 'palais-garnier';
    notreDameLifeGroup.visible = activeMonumentId === 'notre-dame';
    sacreCoeurLifeGroup.visible = activeMonumentId === 'sacre-coeur';
    pantheonLifeGroup.visible = activeMonumentId === 'pantheon';

    if (eustacheLifeGroup.visible) updateEustacheLife(clampedDt, elapsed);
    if (eiffelLifeGroup.visible) updateEiffelLife(clampedDt, elapsed);
    if (arcLifeGroup.visible) updateArcLife(clampedDt, elapsed);
    if (garnierLifeGroup.visible) updateGarnierLife(clampedDt, elapsed);
    if (notreDameLifeGroup.visible) updateNotreDameLife(clampedDt, elapsed);
    if (sacreCoeurLifeGroup.visible) updateSacreCoeurLife(clampedDt, elapsed);
    if (pantheonLifeGroup.visible) updatePantheonLife(clampedDt, elapsed);
  }

  return {
    root: lifeRoot,
    update,
  };
}
