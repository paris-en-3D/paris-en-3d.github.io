import * as THREE from 'three';
import { MONUMENTS, getMonumentById, getParisElevation } from './paris-data.js';
import { buildParisWorld } from './paris-world.js';
import { buildSaintEustacheMonument } from './monuments/saint-eustache.js';
import { buildTourEiffelMonument } from './monuments/tour-eiffel.js';
import { buildArcDeTriompheMonument } from './monuments/arc-de-triomphe.js';
import { buildChampsElyseesAxe } from './monuments/champs-elysees.js';
import { createLightingSystem } from './lighting.js';
import { createCameraController } from './controls.js';
import { createTourSystem } from './tour.js';
import { createLivingWorld } from './life.js';
import { createPerfManager } from './perf-manager.js';

/**
 * ============================================================================
 * POINT D'ENTRÉE PRINCIPAL — PARIS 3D EXPLORATEUR (ÉCHELLE RÉELLE 1:1)
 * ============================================================================
 */

const ui = {
  canvas: document.getElementById('scene-canvas'),
  loadingOverlay: document.getElementById('loading-overlay'),
  loadingProgress: document.getElementById('loading-progress'),
  loadingStatus: document.getElementById('loading-status'),

  btnToggleSidebar: document.getElementById('btn-toggle-sidebar'),
  sidebar: document.getElementById('tour-sidebar'),
  sidebarTitle: document.getElementById('sidebar-monument-title'),

  btnMonumentsMenu: document.getElementById('btn-monuments-menu'),
  currentMonumentLabel: document.getElementById('current-monument-label'),
  btnQuickHop: document.getElementById('btn-quick-hop'),
  monumentsDrawer: document.getElementById('monuments-drawer'),
  btnCloseMonuments: document.getElementById('btn-close-monuments'),
  monumentsList: document.getElementById('monuments-list'),

  btnModeOrbit: document.getElementById('btn-mode-orbit'),
  btnModeFps: document.getElementById('btn-mode-fps'),
  btnPointerLock: document.getElementById('btn-pointer-lock'),
  hintMovement: document.getElementById('hint-movement'),
  crosshair: document.getElementById('crosshair'),

  btnSunPlay: document.getElementById('btn-sun-play'),
  iconPlay: document.getElementById('icon-play'),
  iconPause: document.getElementById('icon-pause'),
  sunSlider: document.getElementById('sun-slider'),
  sunTimeDisplay: document.getElementById('sun-time-display'),
  sunPhaseBadge: document.getElementById('sun-phase-badge'),

  btnToggleMarkers: document.getElementById('btn-toggle-markers'),
  qualityBtns: [...document.querySelectorAll('.quality-btn[data-quality]')],
  perfReadout: document.getElementById('perf-readout'),
  zoneText: document.getElementById('zone-text'),

  poiList: document.getElementById('poi-list'),
  tourCounter: document.getElementById('tour-counter'),
  btnPrevPoi: document.getElementById('btn-prev-poi'),
  btnNextPoi: document.getElementById('btn-next-poi'),

  btnTourPlay: document.getElementById('btn-tour-play'),
  tourIconPlay: document.getElementById('tour-icon-play'),
  tourIconPause: document.getElementById('tour-icon-pause'),
  tourPlayLabel: document.getElementById('tour-play-label'),
  btnTourStop: document.getElementById('btn-tour-stop'),
  btnTourMute: document.getElementById('btn-tour-mute'),
  tourIconSoundOn: document.getElementById('tour-icon-sound-on'),
  tourIconSoundOff: document.getElementById('tour-icon-sound-off'),
  tourAudioStatus: document.getElementById('tour-audio-status'),
  tourAudioStatusText: document.getElementById('tour-audio-status-text'),

  poiCard: document.getElementById('poi-card'),
  cardIndex: document.getElementById('poi-card-index'),
  cardEra: document.getElementById('poi-card-era'),
  cardTitle: document.getElementById('poi-card-title'),
  cardLocation: document.getElementById('poi-card-location'),
  cardHistory: document.getElementById('poi-card-history'),
  cardAnecdote: document.getElementById('poi-card-anecdote'),
  btnCardSpeak: document.getElementById('btn-card-speak'),
  btnCloseCard: document.getElementById('btn-close-card'),
  cardPrevBtn: document.getElementById('card-prev-btn'),
  cardNextBtn: document.getElementById('card-next-btn'),
  cardEnterFpsBtn: document.getElementById('card-enter-fps-btn'),

  tooltip: document.getElementById('poi-hover-tooltip'),
};

function setLoading(percent, message) {
  if (ui.loadingProgress) ui.loadingProgress.style.width = `${percent}%`;
  if (ui.loadingStatus) ui.loadingStatus.textContent = message;
}

function syncSunSliderUI(lighting) {
  const h = lighting.state.hour;
  const formatted = lighting.formatHour(h);
  const [hh, mm] = formatted.split('h');

  ui.sunSlider.value = h.toFixed(2);
  ui.sunSlider.style.setProperty('--attr-min', ui.sunSlider.min || '6');
  ui.sunSlider.style.setProperty('--attr-max', ui.sunSlider.max || '22');
  ui.sunSlider.style.setProperty('--control-value', ui.sunSlider.value);
  ui.sunSlider.setAttribute('aria-valuetext', `${Number(hh)} heures ${mm}`);

  ui.sunTimeDisplay.textContent = formatted;
  ui.sunPhaseBadge.textContent = lighting.state.phaseLabel;
}

function initApp() {
  setLoading(16, 'Initialisation du moteur WebGL Paris 3D…');

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: ui.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
  } catch (err) {
    setLoading(100, 'Impossible d’initialiser WebGL sur ce navigateur.');
    console.error('Erreur WebGL:', err);
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.45,
    11500
  );

  // 1. Socle Paris 3D 1:1 (Seine, îles, ponts, relief, tissu haussmannien InstancedMesh, 10 LODs, bateaux)
  setLoading(36, 'Tracé de la Seine, des ponts et du tissu haussmannien de Paris…');
  const parisWorld = buildParisWorld(scene);

  // 2. Monument complet #1 : Église Saint-Eustache (0, 0, 0)
  setLoading(56, 'Édification de l’église Saint-Eustache et du quartier des Halles…');
  const saintEustache = buildSaintEustacheMonument(scene);

  // 3. Monument complet #2 : La Tour Eiffel (-3694, 0, +556)
  setLoading(68, 'Assemblage de la Tour Eiffel (330 m), du Champ-de-Mars et du Trocadéro…');
  const tourEiffel = buildTourEiffelMonument(scene);

  // 4. Monument complet #3 : L'Arc de Triomphe & Place de l'Étoile (-3658, +18, -1156)
  setLoading(76, "Érection de l'Arc de Triomphe (50 m) et de la Place Charles-de-Gaulle…");
  const arcDeTriomphe = buildArcDeTriompheMonument(scene);

  // 4b. Axe Historique complet : Avenue des Champs-Élysées → Rond-Point → Jardins, Palais & Concorde
  setLoading(85, "Déploiement de l'Avenue des Champs-Élysées jusqu'à la Concorde…");
  const champsElysees = buildChampsElyseesAxe(scene);

  const detailedModules = {
    'saint-eustache': saintEustache,
    'tour-eiffel': tourEiffel,
    'arc-de-triomphe': arcDeTriomphe,
  };

  // 4. Système solaire & ombres dynamiques
  setLoading(86, 'Calibration du cycle solaire et du ciel parisien…');
  const lighting = createLightingSystem(scene);
  syncSunSliderUI(lighting);

  // 5. Contrôleur de caméra & collisions multi-monuments
  const controller = createCameraController({
    camera,
    domElement: ui.canvas,
    onModeChange(mode) {
      const isFps = mode === 'fps';
      ui.btnModeOrbit.classList.toggle('active', !isFps);
      ui.btnModeOrbit.setAttribute('aria-pressed', String(!isFps));
      ui.btnModeFps.classList.toggle('active', isFps);
      ui.btnModeFps.setAttribute('aria-pressed', String(isFps));
      ui.btnPointerLock.hidden = !isFps;
      ui.hintMovement.innerHTML = isFps
        ? '<kbd>ZQSD</kbd>/<kbd>WASD</kbd> • <kbd>Shift</kbd> • <kbd>Glisser</kbd>'
        : '<kbd>C</kbd> Caméra';
    },
    onPointerLockChange(locked) {
      ui.crosshair.hidden = !locked;
      ui.btnPointerLock.classList.toggle('active', locked);
      ui.btnPointerLock.querySelector('span').textContent = locked
        ? 'Échap pour libérer'
        : 'Immersion';
    },
  });

  // 6. Visite guidée dynamique + audio-guide 360°
  const tour = createTourSystem({
    scene,
    camera,
    domElement: ui.canvas,
    controller,
    ui,
  });

  // 7. Vie parisienne (Halles + Tour Eiffel / Champ-de-Mars)
  const livingWorld = createLivingWorld(scene);

  // 8. Moteur de performance (LOD 3 niveaux, ombres adaptatives, profils Éco / Équilibré / Ultra)
  const perfManager = createPerfManager({
    renderer,
    scene,
    camera,
    lighting,
    parisWorld,
    saintEustache,
    tourEiffel,
    arcDeTriomphe,
    livingWorld,
    ui,
  });

  ui.qualityBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      perfManager.setQuality(btn.dataset.quality);
    });
  });

  // --- GESTION DU MONUMENT ACTIF & SÉLECTEUR PARIS ---
  let activeMonumentId = 'saint-eustache';
  const monumentButtons = new Map();

  function setMonumentsDrawerOpen(open) {
    ui.monumentsDrawer.hidden = !open;
    ui.btnMonumentsMenu.setAttribute('aria-expanded', String(open));
  }

  function renderMonumentsMenu() {
    ui.monumentsList.innerHTML = '';
    monumentButtons.clear();
    MONUMENTS.forEach((m) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'monument-card-btn';
      btn.dataset.monumentId = m.id;
      const isDetailed = m.status === 'detailed';
      btn.innerHTML = `
        <div class="monument-card-top">
          <span class="monument-card-name">${m.shortName}</span>
          <span class="monument-badge ${isDetailed ? 'detailed' : 'lod'}">${isDetailed ? 'Complet' : 'LOD'}</span>
        </div>
        <span class="monument-card-district">${m.district}</span>
      `;
      btn.addEventListener('click', () => {
        setMonumentsDrawerOpen(false);
        selectMonument(m.id);
      });
      li.appendChild(btn);
      ui.monumentsList.appendChild(li);
      monumentButtons.set(m.id, btn);
    });
  }

  function selectMonument(id, { immediate = false } = {}) {
    const mon = getMonumentById(id);
    activeMonumentId = mon.id;
    const detail = detailedModules[mon.id] || null;

    // Mise à jour menu monuments + bouton rapide
    monumentButtons.forEach((btn, btnId) => {
      btn.classList.toggle('active', btnId === mon.id);
    });
    ui.currentMonumentLabel.textContent = mon.shortName;
    if (ui.btnQuickHop) {
      const nextHop =
        mon.id === 'saint-eustache'
          ? '⇄ Tour Eiffel'
          : mon.id === 'tour-eiffel'
            ? '⇄ Arc de Triomphe'
            : '⇄ Saint-Eustache';
      ui.btnQuickHop.querySelector('span').textContent = nextHop;
    }

    // Ombres haute précision centrées sur le monument choisi (sans écraser le rayon du profil qualité)
    lighting.setFocusCenter(mon.pos);

    // Contexte physique & sol du monument
    if (detail) {
      controller.setActiveMonumentContext({
        id: mon.id,
        colliders: detail.colliders,
        circleColliders: detail.circleColliders,
        worldBounds: detail.worldBounds,
        getFloorHeightAt: detail.getFloorHeightAt,
        fpsSpawnPos: detail.fpsSpawnPos,
        fpsSpawnTarget: detail.fpsSpawnTarget,
      });
    } else {
      controller.setActiveMonumentContext({
        id: mon.id,
        colliders: [],
        circleColliders: [{ x: mon.pos.x, z: mon.pos.z, r: 22 }],
        worldBounds: { minX: mon.pos.x - 320, maxX: mon.pos.x + 320, minZ: mon.pos.z - 320, maxZ: mon.pos.z + 320 },
        getFloorHeightAt: (x, z) => getParisElevation(x, z),
        fpsSpawnPos: new THREE.Vector3(mon.pos.x - 95, mon.groundY + 1.75, mon.pos.z + 95),
        fpsSpawnTarget: new THREE.Vector3(mon.pos.x, mon.groundY + 24, mon.pos.z),
      });
    }

    // Visite guidée adaptée au monument
    tour.setMonumentTour({
      monument: mon,
      introChapter: detail ? detail.introChapter : null,
      pois: detail ? detail.pois : [],
    });

    if (immediate) {
      camera.position.copy(mon.defaultCameraPos);
      controller.orbit.target.copy(mon.defaultTarget);
      controller.orbit.update();
    } else {
      controller.flyArcTo(mon.defaultCameraPos, mon.defaultTarget);
    }
  }

  renderMonumentsMenu();
  selectMonument('saint-eustache', { immediate: true });

  // --- CONNEXION DES CONTRÔLES HUD ---
  ui.btnMonumentsMenu.addEventListener('click', () => {
    setMonumentsDrawerOpen(ui.monumentsDrawer.hidden);
  });
  ui.btnCloseMonuments.addEventListener('click', () => setMonumentsDrawerOpen(false));
  ui.btnQuickHop.addEventListener('click', () => {
    setMonumentsDrawerOpen(false);
    const nextId =
      activeMonumentId === 'saint-eustache'
        ? 'tour-eiffel'
        : activeMonumentId === 'tour-eiffel'
          ? 'arc-de-triomphe'
          : 'saint-eustache';
    selectMonument(nextId);
  });

  ui.btnModeOrbit.addEventListener('click', () => controller.setMode('orbit'));
  ui.btnModeFps.addEventListener('click', () => controller.setMode('fps'));
  ui.btnPointerLock.addEventListener('click', () => controller.requestPointerLock());

  ui.sunSlider.addEventListener('input', () => {
    const val = parseFloat(ui.sunSlider.value);
    lighting.setTimeOfDay(val);
    syncSunSliderUI(lighting);
  });

  function updatePlayButtonUI() {
    const playing = lighting.state.isPlaying;
    ui.btnSunPlay.setAttribute('aria-pressed', String(playing));
    ui.iconPlay.hidden = playing;
    ui.iconPause.hidden = !playing;
  }

  ui.btnSunPlay.addEventListener('click', () => {
    lighting.state.isPlaying = !lighting.state.isPlaying;
    updatePlayButtonUI();
  });

  ui.btnToggleSidebar.addEventListener('click', () => {
    const collapsed = ui.sidebar.classList.toggle('collapsed');
    ui.btnToggleSidebar.setAttribute('aria-expanded', String(!collapsed));
  });

  ui.btnToggleMarkers.addEventListener('click', () => {
    const next = !tour.state.markersVisible;
    tour.setMarkersVisible(next);
    ui.btnToggleMarkers.classList.toggle('active', next);
    ui.btnToggleMarkers.setAttribute('aria-pressed', String(next));
  });

  window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  });

  // --- BOUCLE D'ANIMATION PRINCIPALE ---
  const clock = new THREE.Clock();
  let lastZoneCheck = 0;

  setLoading(96, 'Rendu initial de Paris 3D…');
  lighting.syncToCamera(camera.position);
  perfManager.beforeRender(0.016);
  renderer.render(scene, camera);
  perfManager.afterRender(0.016);
  setLoading(100, 'Bienvenue dans Paris 3D !');
  requestAnimationFrame(() => {
    ui.loadingOverlay.classList.add('fade-out');
  });

  function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();

    if (lighting.update(dt)) {
      syncSunSliderUI(lighting);
    }

    controller.update(dt);
    lighting.syncToCamera(camera.position);
    tour.update(dt);

    // Adaptation dynamique du near-plane selon l'altitude pour maximiser la précision du z-buffer (Seine / reflets)
    const targetNear = THREE.MathUtils.clamp(0.55 + Math.max(0, camera.position.y - 18) * 0.014, 0.55, 2.8);
    if (Math.abs(camera.near - targetNear) > 0.05) {
      camera.near = targetNear;
      camera.updateProjectionMatrix();
    }

    perfManager.beforeRender(dt);

    const nf = lighting.state.nightFactor;
    const gg = lighting.state.glassGlow;
    const sunDir = lighting.getSunDirection();
    saintEustache.update(dt, nf, gg, activeMonumentId === 'saint-eustache');
    tourEiffel.update(dt, nf, sunDir);
    arcDeTriomphe.update(dt, nf);
    champsElysees.update(dt, nf, camera.position);
    parisWorld.update(dt, nf, sunDir, scene.fog.color, scene.fog.density);
    livingWorld.update(dt, nf, activeMonumentId);

    lastZoneCheck += dt;
    if (lastZoneCheck > 0.25) {
      lastZoneCheck = 0;
      ui.zoneText.textContent = controller.getZoneName();
    }

    renderer.render(scene, camera);
    perfManager.afterRender(dt);
  }

  animate();

  window.__paris3d = {
    scene,
    camera,
    renderer,
    lighting,
    controller,
    tour,
    perf: perfManager,
    selectMonument,
    MONUMENTS,
  };
}

initApp();
