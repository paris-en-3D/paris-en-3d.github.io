import * as THREE from 'three';

/**
 * ============================================================================
 * SYSTÈME DE VISITE GUIDÉE DYNAMIQUE MULTI-MONUMENTS + AUDIO-GUIDE 360°
 * - S'adapte instantanément au monument actif (Saint-Eustache, Tour Eiffel, Arc ou LOD)
 * - Marqueurs 3D lumineux cliquables (Raycaster)
 * - Voix off clonée pré-enregistrée « Laurent » (MP3) + fallback Web Speech API
 * ============================================================================
 */

function createGlowSpriteTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255, 244, 200, 1)');
  g.addColorStop(0.32, 'rgba(235, 185, 96, 0.72)');
  g.addColorStop(0.7, 'rgba(229, 165, 66, 0.18)');
  g.addColorStop(1, 'rgba(229, 165, 66, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createTourSystem({
  scene,
  camera,
  domElement,
  controller,
  ui,
}) {
  const markersGroup = new THREE.Group();
  markersGroup.name = 'TourPOIMarkers';
  scene.add(markersGroup);

  const glowTex = createGlowSpriteTexture();
  const raycaster = new THREE.Raycaster();
  const pointerNDC = new THREE.Vector2();

  let currentMonument = null;
  let currentIntro = null;
  let currentPois = [];
  let markerObjects = [];
  let hitTargets = [];
  let listButtons = [];

  const coreMatDefault = new THREE.MeshStandardMaterial({
    color: 0xffd782,
    emissive: new THREE.Color(0xe5a942),
    emissiveIntensity: 0.9,
    roughness: 0.25,
    metalness: 0.65,
  });
  const coreMatActive = new THREE.MeshStandardMaterial({
    color: 0xfff5d6,
    emissive: new THREE.Color(0xffca63),
    emissiveIntensity: 1.5,
    roughness: 0.2,
    metalness: 0.7,
  });
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xf4cf84,
    transparent: true,
    opacity: 0.78,
    side: THREE.DoubleSide,
  });

  const state = {
    activeIndex: -1, // -2 = Prologue 360°, 0..N-1 = POIs, -1 = aucun
    hoveredIndex: -1,
    markersVisible: true,
    elapsed: 0,
    isAutoTour: false,
    isPaused: false,
    isMuted: false,
    isSpeaking: false,
  };

  // --- MOTEUR AUDIO VOIX OFF « LAURENT » (MP3 PRÉ-ENREGISTRÉS + FALLBACK WEB SPEECH) ---
  const hasSpeech = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
  const narAudio = typeof Audio !== 'undefined' ? new Audio() : null;
  if (narAudio) {
    narAudio.preload = 'auto';
  }

  let audioManifest = null;
  let preferredFrenchVoice = null;
  let isMaleVoiceSelected = false;
  let speechToken = 0;
  let fallbackTimer = null;
  let nextStepTimer = null;
  let currentSentences = [];
  let currentSentenceIndex = 0;
  let activeAudioMode = null; // 'mp3' | 'tts' | null
  let activeAudioKey = null;
  let activeOnDone = null;

  if (typeof fetch === 'function') {
    fetch('./audio/laurent/manifest.json', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.tracks) {
          audioManifest = data;
          updateAudioUI();
        }
      })
      .catch(() => {
        // Fallback Web Speech API silencieux si manifeste absent
      });
  }

  function getCustomTrack(audioKey) {
    if (!audioKey || !audioManifest || !audioManifest.tracks) return null;
    return audioManifest.tracks[audioKey] || null;
  }

  function hasLaurentVoiceForActiveMonument() {
    if (!currentMonument) return false;
    return Boolean(getCustomTrack(`${currentMonument.id}/intro`));
  }

  function pickFrenchVoice() {
    if (!hasSpeech) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    if (!voices.length) return null;
    const frVoices = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith('fr'));
    if (!frVoices.length) return null;

    const malePattern = /\b(henri|paul|r[ée]my|claude|alain|thomas|nicolas|antoine|guillaume|jerome|j[ée]r[ôo]me|mathieu|fabrice|thierry|jacques|yves|bernard|male|homme)\b/i;
    const naturalMale = frVoices.find((v) => malePattern.test(v.name) && /natural|online|neural/i.test(v.name));
    if (naturalMale) {
      isMaleVoiceSelected = true;
      return naturalMale;
    }

    const anyMale = frVoices.find((v) => malePattern.test(v.name));
    if (anyMale) {
      isMaleVoiceSelected = true;
      return anyMale;
    }

    const femalePattern = /\b(hortense|denise|julie|am[ée]lie|audrey|eloise|brigitte|celeste|coralie|josephine|vivienne|marie|claire|celine|c[ée]line|female|femme)\b/i;
    const nonFemale = frVoices.find((v) => !femalePattern.test(v.name));
    isMaleVoiceSelected = false;
    return nonFemale || frVoices.find((v) => v.lang.toLowerCase() === 'fr-fr') || frVoices[0];
  }

  if (hasSpeech) {
    preferredFrenchVoice = pickFrenchVoice();
    window.speechSynthesis.addEventListener('voiceschanged', () => {
      preferredFrenchVoice = pickFrenchVoice();
    });
  }

  function clearSpeechTimers() {
    if (fallbackTimer) {
      clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }
    if (nextStepTimer) {
      clearTimeout(nextStepTimer);
      nextStepTimer = null;
    }
  }

  function stopVoice() {
    speechToken++;
    clearSpeechTimers();
    activeAudioMode = null;
    activeAudioKey = null;
    activeOnDone = null;
    currentSentences = [];
    currentSentenceIndex = 0;
    state.isSpeaking = false;
    if (narAudio) {
      narAudio.onended = null;
      narAudio.onerror = null;
      try {
        narAudio.pause();
        narAudio.currentTime = 0;
      } catch {
        // Ignore
      }
    }
    if (hasSpeech) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
    updateAudioUI();
  }

  function splitIntoSentences(text) {
    const matches = text.match(/[^.!?]+[.!?]+/g);
    if (!matches) return [text.trim()];
    return matches.map((s) => s.trim()).filter(Boolean);
  }

  function speakTextWebSpeech(text, onDone = null, existingToken = null) {
    const token = existingToken !== null ? existingToken : (() => {
      stopVoice();
      return speechToken;
    })();
    activeAudioMode = 'tts';
    activeOnDone = onDone;

    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const estimatedMs = Math.max(6500, Math.min(28000, wordCount * 310));

    if (state.isMuted || !hasSpeech) {
      state.isSpeaking = true;
      updateAudioUI();
      if (onDone) {
        fallbackTimer = setTimeout(() => {
          if (token !== speechToken || state.isPaused) return;
          activeAudioMode = null;
          activeOnDone = null;
          state.isSpeaking = false;
          updateAudioUI();
          onDone();
        }, estimatedMs);
      }
      return;
    }

    currentSentences = splitIntoSentences(text);
    currentSentenceIndex = 0;
    state.isSpeaking = true;
    updateAudioUI();

    if (!preferredFrenchVoice) {
      preferredFrenchVoice = pickFrenchVoice();
    }

    const speakNextSentence = () => {
      if (token !== speechToken || state.isPaused) return;
      if (currentSentenceIndex >= currentSentences.length) {
        activeAudioMode = null;
        activeOnDone = null;
        state.isSpeaking = false;
        updateAudioUI();
        if (onDone) onDone();
        return;
      }

      const sentence = currentSentences[currentSentenceIndex];
      const utt = new SpeechSynthesisUtterance(sentence);
      utt.lang = 'fr-FR';
      utt.rate = 0.91;
      utt.pitch = isMaleVoiceSelected ? 0.78 : 0.65;
      if (preferredFrenchVoice) utt.voice = preferredFrenchVoice;

      let settled = false;
      const finishSentence = () => {
        if (settled || token !== speechToken) return;
        settled = true;
        if (fallbackTimer) {
          clearTimeout(fallbackTimer);
          fallbackTimer = null;
        }
        if (state.isPaused) return;
        currentSentenceIndex++;
        speakNextSentence();
      };

      utt.onend = finishSentence;
      utt.onerror = () => {
        if (settled || token !== speechToken) return;
        fallbackTimer = setTimeout(finishSentence, Math.max(3500, sentence.length * 48));
      };

      fallbackTimer = setTimeout(finishSentence, Math.max(9000, sentence.length * 95));

      try {
        window.speechSynthesis.speak(utt);
      } catch {
        fallbackTimer = setTimeout(finishSentence, 4500);
      }
    };

    speakNextSentence();
  }

  function playNarration({ audioKey = null, text = '', onDone = null }) {
    stopVoice();
    const token = speechToken;
    const track = getCustomTrack(audioKey);

    if (track && narAudio) {
      activeAudioMode = 'mp3';
      activeAudioKey = audioKey;
      activeOnDone = onDone;
      state.isSpeaking = true;
      updateAudioUI();

      let settled = false;
      const finalizeMp3 = () => {
        if (settled || token !== speechToken || state.isPaused) return;
        settled = true;
        clearSpeechTimers();
        narAudio.onended = null;
        narAudio.onerror = null;
        activeAudioMode = null;
        activeAudioKey = null;
        activeOnDone = null;
        state.isSpeaking = false;
        updateAudioUI();
        if (onDone) onDone();
      };

      const fallbackToSpeech = () => {
        if (settled || token !== speechToken || state.isPaused) return;
        settled = true;
        clearSpeechTimers();
        narAudio.onended = null;
        narAudio.onerror = null;
        activeAudioKey = null;
        speakTextWebSpeech(text, onDone, token);
      };

      const relPath = String(track.file || '').replace(/^\.?\//, '');
      narAudio.muted = state.isMuted;
      narAudio.volume = 1.0;
      narAudio.src = `./${relPath}`;
      narAudio.currentTime = 0;
      narAudio.onended = finalizeMp3;
      narAudio.onerror = fallbackToSpeech;

      const safeTimeoutMs = Math.max(10000, Math.ceil(((Number(track.duration) || 20) + 5) * 1000));
      fallbackTimer = setTimeout(finalizeMp3, safeTimeoutMs);

      try {
        const playPromise = narAudio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch((err) => {
            if (token !== speechToken || state.isPaused) return;
            if (err && err.name === 'AbortError') return;
            fallbackToSpeech();
          });
        }
      } catch {
        fallbackToSpeech();
      }
      return;
    }

    speakTextWebSpeech(text, onDone, token);
  }

  function updateAudioUI() {
    if (!ui.btnTourPlay) return;
    const active = state.isAutoTour;
    const playing = active && !state.isPaused;
    const total = currentPois.length;
    const hasLaurent = activeAudioMode === 'mp3' || hasLaurentVoiceForActiveMonument();

    ui.tourIconPlay.hidden = playing;
    ui.tourIconPause.hidden = !playing;
    ui.tourPlayLabel.textContent = !active
      ? 'Lancer la visite audio'
      : state.isPaused
        ? 'Reprendre la visite'
        : 'Mettre en pause';

    ui.btnTourStop.disabled = !active;
    ui.btnTourMute.setAttribute('aria-pressed', String(state.isMuted));
    ui.tourIconSoundOn.hidden = state.isMuted;
    ui.tourIconSoundOff.hidden = !state.isMuted;

    if (active) {
      ui.tourAudioStatus.hidden = false;
      ui.tourAudioStatus.classList.toggle('paused', state.isPaused);
      const monName = currentMonument ? currentMonument.shortName : 'Paris';
      const voiceSuffix = hasLaurent ? ' (Voix Laurent)' : '';
      const stepVoiceLabel = hasLaurent ? 'Voix Laurent…' : 'Voix off en cours…';
      if (state.activeIndex === -2) {
        ui.tourAudioStatusText.textContent = state.isPaused
          ? 'Tour 360° en pause'
          : state.isMuted
            ? `Tour 360° • ${monName} (silencieux)`
            : `Tour 360° • ${monName}${voiceSuffix}…`;
      } else if (state.activeIndex >= 0) {
        ui.tourAudioStatusText.textContent = state.isPaused
          ? `Étape ${state.activeIndex + 1} / ${total} en pause`
          : state.isMuted
            ? `Étape ${state.activeIndex + 1} / ${total} • Mode silencieux`
            : `Étape ${state.activeIndex + 1} / ${total} • ${stepVoiceLabel}`;
      }
    } else {
      ui.tourAudioStatus.hidden = true;
    }

    if (ui.btnCardSpeak) {
      ui.btnCardSpeak.setAttribute('aria-pressed', String(state.isSpeaking && !state.isMuted));
    }
  }

  function rebuildMarkers() {
    while (markersGroup.children.length > 0) {
      markersGroup.remove(markersGroup.children[0]);
    }
    markerObjects = [];
    hitTargets = [];

    const isTallMonument = currentMonument && currentMonument.id === 'tour-eiffel';
    const markerScale = isTallMonument ? 2.1 : 1.0;

    currentPois.forEach((poi, index) => {
      const group = new THREE.Group();
      group.position.copy(poi.markerPos);
      group.scale.setScalar(markerScale);

      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), coreMatDefault.clone());
      group.add(core);

      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.055, 8, 28), ringMat.clone());
      ring.rotation.x = Math.PI * 0.5;
      group.add(ring);

      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex,
          transparent: true,
          depthWrite: false,
          opacity: 0.85,
        })
      );
      sprite.scale.set(2.8, 2.8, 1);
      group.add(sprite);

      const hitMesh = new THREE.Mesh(
        new THREE.SphereGeometry(1.65, 10, 8),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitMesh.userData.poiIndex = index;
      group.add(hitMesh);

      markersGroup.add(group);
      markerObjects.push({ group, core, ring, sprite, baseY: poi.markerPos.y, phase: index * 0.95 });
      hitTargets.push(hitMesh);
    });
  }

  function rebuildSidebarList() {
    ui.poiList.innerHTML = '';
    listButtons = [];

    if (currentPois.length === 0 && currentMonument) {
      const li = document.createElement('li');
      li.className = 'lod-notice';
      li.innerHTML = `
        <strong>${currentMonument.name}</strong>
        <p>${currentMonument.summary}</p>
        <span class="lod-badge">Aperçu LOD dans Paris • Modélisation détaillée prévue dans une prochaine étape</span>
      `;
      ui.poiList.appendChild(li);
      ui.btnPrevPoi.disabled = true;
      ui.btnNextPoi.disabled = true;
      return;
    }

    ui.btnPrevPoi.disabled = false;
    ui.btnNextPoi.disabled = false;

    currentPois.forEach((poi, idx) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'poi-item-btn';
      btn.innerHTML = `
        <span class="poi-num">${idx + 1}</span>
        <span class="poi-item-text">
          <span class="poi-item-title">${poi.shortTitle}</span>
          <span class="poi-item-era">${poi.era}</span>
        </span>
      `;
      btn.addEventListener('click', () => {
        if (state.isAutoTour) playAutoStep(idx);
        else selectPoi(idx);
      });
      li.appendChild(btn);
      ui.poiList.appendChild(li);
      listButtons.push(btn);
    });
  }

  function setMonumentTour({ monument, introChapter = null, pois = [] }) {
    if (state.isAutoTour) {
      state.isAutoTour = false;
      state.isPaused = false;
    }
    stopVoice();
    if (ui.poiCard.open) ui.poiCard.close();

    currentMonument = monument;
    currentPois = pois || [];
    currentIntro = introChapter || {
      id: `intro-${monument.id}`,
      title: `${monument.name} — Tour 360°`,
      era: monument.era,
      location: monument.district,
      history: monument.summary,
      anecdote:
        "Ce monument fait partie du grand plan de Paris à l'échelle 1:1. Tu peux survoler sa silhouette à 360° ou choisir Saint-Eustache et la Tour Eiffel pour une exploration intérieure et extérieure ultra-détaillée.",
      voiceover: `${monument.name}. ${monument.summary}`,
    };

    state.activeIndex = -1;
    state.hoveredIndex = -1;
    if (ui.sidebarTitle) {
      ui.sidebarTitle.textContent = monument.shortName;
    }
    rebuildMarkers();
    rebuildSidebarList();
    updateSidebarSelection();
    updateAudioUI();
  }

  function updateSidebarSelection() {
    listButtons.forEach((btn, idx) => {
      btn.classList.toggle('active', idx === state.activeIndex);
    });
    const total = currentPois.length;
    ui.tourCounter.textContent =
      state.activeIndex === -2
        ? '360°'
        : total === 0
          ? 'LOD'
          : `${state.activeIndex >= 0 ? state.activeIndex + 1 : 0} / ${total}`;

    markerObjects.forEach((m, idx) => {
      const isAct = idx === state.activeIndex;
      m.group.visible = !isAct;
      m.core.material = isAct ? coreMatActive : coreMatDefault;
      m.ring.material.opacity = isAct ? 1.0 : 0.72;
    });
  }

  function showChapterCard(chapter, badgeText, showFpsBtn = true) {
    ui.cardIndex.textContent = badgeText;
    ui.cardEra.textContent = chapter.era;
    ui.cardTitle.textContent = chapter.title;
    ui.cardLocation.textContent = chapter.location;
    ui.cardHistory.textContent = chapter.history;
    ui.cardAnecdote.textContent = chapter.anecdote;
    if (ui.cardEnterFpsBtn) {
      ui.cardEnterFpsBtn.hidden = !showFpsBtn;
    }
    if (ui.cardPrevBtn) ui.cardPrevBtn.hidden = currentPois.length === 0;
    if (ui.cardNextBtn) ui.cardNextBtn.hidden = currentPois.length === 0;

    if (!ui.poiCard.open) {
      ui.poiCard.show();
    }
  }

  function showPoiCard(poi, index) {
    showChapterCard(poi, `Étape ${index + 1} / ${currentPois.length}`, true);
  }

  function getPoiSpeechText(poi, index, total = currentPois.length) {
    const ordinals = [
      'Première',
      'Deuxième',
      'Troisième',
      'Quatrième',
      'Cinquième',
      'Sixième',
      'Septième',
      'Huitième',
      'Neuvième',
      'Dixième',
    ];
    let stepPrefix;
    if (index < ordinals.length) {
      stepPrefix = index === total - 1 && total > 1
        ? `${ordinals[index]} et dernière étape`
        : `${ordinals[index]} étape`;
    } else {
      stepPrefix = index === total - 1 && total > 1
        ? `Étape ${index + 1} et dernière étape`
        : `Étape ${index + 1}`;
    }
    return `${stepPrefix} : ${poi.title}. ${poi.history} ${poi.anecdote}`;
  }

  function getFinaleSpeechText(monument) {
    if (!monument) {
      return "Notre visite guidée de ce monument s'achève ici. Tu peux explorer librement Paris, changer de monument dans le bandeau supérieur ou faire varier la course du soleil.";
    }
    const byId = {
      'saint-eustache': "de l'Église Saint-Eustache",
      'tour-eiffel': 'de la Tour Eiffel',
      'arc-de-triomphe': "de l'Arc de Triomphe de l'Étoile",
    };
    let deMonName = byId[monument.id];
    if (!deMonName) {
      const rawName = monument.name || 'ce monument';
      if (/^Le\s+/i.test(rawName)) deMonName = `du ${rawName.replace(/^Le\s+/i, '')}`;
      else if (/^La\s+/i.test(rawName)) deMonName = `de la ${rawName.replace(/^La\s+/i, '')}`;
      else if (/^L['’]/i.test(rawName)) deMonName = `de l'${rawName.replace(/^L['’]/i, '')}`;
      else if (/^Les\s+/i.test(rawName)) deMonName = `des ${rawName.replace(/^Les\s+/i, '')}`;
      else deMonName = /^[aeiouhéèêàâîïôöùûy]/i.test(rawName) ? `de l'${rawName}` : `de ${rawName}`;
    }
    return `Notre visite guidée ${deMonName} s'achève ici. Tu peux explorer librement Paris, changer de monument dans le bandeau supérieur ou faire varier la course du soleil.`;
  }

  let pendingNextStep = null;

  function scheduleNextStep(nextIndex, delayMs) {
    pendingNextStep = nextIndex;
    nextStepTimer = setTimeout(() => {
      if (state.isAutoTour && !state.isPaused) {
        pendingNextStep = null;
        playAutoStep(nextIndex);
      }
    }, delayMs);
  }

  function stopAutoTour({ keepCard = false } = {}) {
    state.isAutoTour = false;
    state.isPaused = false;
    pendingNextStep = null;
    stopVoice();
    controller.cancelFlight();
    if (!keepCard && state.activeIndex === -2) {
      closePoiCard();
    }
    updateAudioUI();
  }

  function playAutoStep(stepIndex) {
    clearSpeechTimers();
    pendingNextStep = null;
    state.isAutoTour = true;
    state.isPaused = false;

    if (stepIndex === -2) {
      state.activeIndex = -2;
      updateSidebarSelection();
      showChapterCard(currentIntro, 'Prologue • Vue 360°', false);

      const introKey = currentMonument ? `${currentMonument.id}/intro` : null;
      const introTrack = getCustomTrack(introKey);
      const orbitCfg = currentMonument && currentMonument.orbit360Config
        ? {
            ...currentMonument.orbit360Config,
            duration: introTrack && introTrack.duration
              ? Math.max(currentMonument.orbit360Config.duration || 28, introTrack.duration + 1.5)
              : currentMonument.orbit360Config.duration,
          }
        : undefined;
      controller.startOrbit360(orbitCfg);
      updateAudioUI();

      playNarration({
        audioKey: introKey,
        text: currentIntro.voiceover,
        onDone: () => {
          if (!state.isAutoTour || state.isPaused) return;
          scheduleNextStep(currentPois.length > 0 ? 0 : currentPois.length, 1200);
        },
      });
      return;
    }

    if (stepIndex >= currentPois.length) {
      const finaleKey = currentMonument ? `${currentMonument.id}/finale` : null;
      const finale = getFinaleSpeechText(currentMonument);
      state.isAutoTour = false;
      state.isPaused = false;
      state.activeIndex = -1;
      updateSidebarSelection();
      updateAudioUI();
      if (currentMonument) {
        controller.flyTo(currentMonument.defaultCameraPos, currentMonument.defaultTarget, { duration: 2.2 });
      }
      playNarration({ audioKey: finaleKey, text: finale });
      return;
    }

    const poi = currentPois[stepIndex];
    const poiKey = currentMonument ? `${currentMonument.id}/${poi.id}` : null;
    state.activeIndex = stepIndex;
    updateSidebarSelection();
    showPoiCard(poi, stepIndex);
    updateAudioUI();

    if (controller.state.mode === 'fps') {
      controller.setMode('orbit', { preservePosition: true });
    }
    controller.flyTo(poi.cameraPos, poi.target, {
      duration: 2.0,
      onComplete: () => {
        if (!state.isAutoTour || state.isPaused || state.activeIndex !== stepIndex) return;
        playNarration({
          audioKey: poiKey,
          text: getPoiSpeechText(poi, stepIndex, currentPois.length),
          onDone: () => {
            if (!state.isAutoTour || state.isPaused) return;
            scheduleNextStep(stepIndex + 1, 1300);
          },
        });
      },
    });
  }

  function toggleAutoTourPlay() {
    if (!state.isAutoTour) {
      playAutoStep(-2);
      return;
    }

    if (!state.isPaused) {
      state.isPaused = true;
      clearSpeechTimers();
      controller.setOrbit360Paused(true);
      if (activeAudioMode === 'mp3' && narAudio) {
        try {
          narAudio.pause();
        } catch {
          // ignore
        }
      } else if (hasSpeech) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
      }
      state.isSpeaking = false;
      updateAudioUI();
    } else {
      state.isPaused = false;
      controller.setOrbit360Paused(false);
      updateAudioUI();

      if (activeAudioMode === 'mp3' && narAudio && narAudio.src) {
        if (narAudio.ended) {
          if (typeof narAudio.onended === 'function') {
            narAudio.onended();
          } else {
            const cb = activeOnDone;
            activeAudioMode = null;
            activeAudioKey = null;
            activeOnDone = null;
            state.isSpeaking = false;
            updateAudioUI();
            if (cb) cb();
          }
          return;
        }
        const track = getCustomTrack(activeAudioKey);
        const remainingSec = Number.isFinite(narAudio.duration)
          ? Math.max(1, narAudio.duration - narAudio.currentTime)
          : (Number(track && track.duration) || 20);
        const resumeToken = speechToken;
        state.isSpeaking = true;
        narAudio.muted = state.isMuted;
        updateAudioUI();
        fallbackTimer = setTimeout(() => {
          if (resumeToken === speechToken && !state.isPaused && typeof narAudio.onended === 'function') {
            narAudio.onended();
          }
        }, Math.ceil((remainingSec + 5) * 1000));
        try {
          const playPromise = narAudio.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {
              // ignore interruption
            });
          }
        } catch {
          // ignore
        }
        return;
      }

      if (pendingNextStep !== null) {
        const nextIdx = pendingNextStep;
        pendingNextStep = null;
        playAutoStep(nextIdx);
        return;
      }

      if (state.activeIndex === -2) {
        if (activeAudioMode === 'tts') {
          const remaining = currentSentences.slice(currentSentenceIndex).join(' ') || currentIntro.voiceover;
          speakTextWebSpeech(remaining, () => {
            if (!state.isAutoTour || state.isPaused) return;
            scheduleNextStep(currentPois.length > 0 ? 0 : currentPois.length, 1000);
          });
        } else {
          playAutoStep(-2);
        }
      } else if (state.activeIndex >= 0 && currentPois[state.activeIndex]) {
        if (activeAudioMode === 'tts') {
          const poi = currentPois[state.activeIndex];
          const remaining = currentSentences.slice(currentSentenceIndex).join(' ') || getPoiSpeechText(poi, state.activeIndex, currentPois.length);
          speakTextWebSpeech(remaining, () => {
            if (!state.isAutoTour || state.isPaused) return;
            scheduleNextStep(state.activeIndex + 1, 1200);
          });
        } else {
          playAutoStep(state.activeIndex);
        }
      }
    }
  }

  function toggleMute() {
    state.isMuted = !state.isMuted;
    if ((activeAudioMode === 'mp3' || hasLaurentVoiceForActiveMonument()) && narAudio) {
      narAudio.muted = state.isMuted;
      updateAudioUI();
      return;
    }
    if (state.isMuted && hasSpeech) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    if (state.isAutoTour && !state.isPaused) {
      playAutoStep(state.activeIndex);
    } else {
      updateAudioUI();
    }
  }

  function closePoiCard() {
    if (state.isAutoTour) {
      stopAutoTour({ keepCard: true });
    } else {
      stopVoice();
    }
    if (ui.poiCard.open) {
      ui.poiCard.close();
    }
    state.activeIndex = -1;
    updateSidebarSelection();
  }

  function selectPoi(index) {
    if (!currentPois.length) return;
    stopVoice();
    const wrapped = ((index % currentPois.length) + currentPois.length) % currentPois.length;
    const poi = currentPois[wrapped];
    state.activeIndex = wrapped;
    updateSidebarSelection();
    showPoiCard(poi, wrapped);

    if (controller.state.mode === 'fps') {
      controller.setMode('orbit', { preservePosition: true });
    }
    controller.flyTo(poi.cameraPos, poi.target, { duration: 1.75 });
  }

  function nextPoi() {
    if (!currentPois.length) return;
    if (state.isAutoTour) {
      playAutoStep(state.activeIndex === -2 ? 0 : (state.activeIndex + 1) % currentPois.length);
    } else {
      selectPoi(state.activeIndex < 0 ? 0 : state.activeIndex + 1);
    }
  }

  function prevPoi() {
    if (!currentPois.length) return;
    if (state.isAutoTour) {
      playAutoStep(state.activeIndex <= 0 ? currentPois.length - 1 : state.activeIndex - 1);
    } else {
      selectPoi(state.activeIndex < 0 ? currentPois.length - 1 : state.activeIndex - 1);
    }
  }

  function setMarkersVisible(visible) {
    state.markersVisible = visible;
    markersGroup.visible = visible;
    if (!visible) {
      ui.tooltip.hidden = true;
      domElement.classList.remove('pointer-hover');
    }
  }

  function pickMarker(clientX, clientY) {
    if (!state.markersVisible || controller.pointerLock.isLocked || !hitTargets.length) return -1;
    const rect = domElement.getBoundingClientRect();
    pointerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointerNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointerNDC, camera);
    const hits = raycaster.intersectObjects(hitTargets, false);
    if (hits.length > 0) {
      return hits[0].object.userData.poiIndex;
    }
    return -1;
  }

  domElement.addEventListener('pointermove', (e) => {
    const idx = pickMarker(e.clientX, e.clientY);
    state.hoveredIndex = idx;
    if (idx >= 0 && currentPois[idx]) {
      const poi = currentPois[idx];
      domElement.classList.add('pointer-hover');
      ui.tooltip.textContent = `${idx + 1}. ${poi.shortTitle}`;
      ui.tooltip.style.left = `${e.clientX}px`;
      ui.tooltip.style.top = `${e.clientY}px`;
      ui.tooltip.hidden = false;
    } else {
      domElement.classList.remove('pointer-hover');
      ui.tooltip.hidden = true;
    }
  });

  domElement.addEventListener('pointerup', (e) => {
    if (e.button !== 0 || controller.wasDragGesture()) return;
    const idx = pickMarker(e.clientX, e.clientY);
    if (idx >= 0) {
      selectPoi(idx);
    }
  });

  ui.btnPrevPoi.addEventListener('click', prevPoi);
  ui.btnNextPoi.addEventListener('click', nextPoi);
  ui.cardPrevBtn.addEventListener('click', prevPoi);
  ui.cardNextBtn.addEventListener('click', nextPoi);
  ui.btnCloseCard.addEventListener('click', closePoiCard);
  ui.cardEnterFpsBtn.addEventListener('click', () => {
    if (state.isAutoTour) stopAutoTour({ keepCard: true });
    if (state.activeIndex >= 0 && currentPois[state.activeIndex]) {
      const poi = currentPois[state.activeIndex];
      controller.enterFpsAt(poi.fpsPos, poi.target);
    }
  });

  if (ui.btnTourPlay) ui.btnTourPlay.addEventListener('click', toggleAutoTourPlay);
  if (ui.btnTourStop) ui.btnTourStop.addEventListener('click', () => stopAutoTour());
  if (ui.btnTourMute) ui.btnTourMute.addEventListener('click', toggleMute);
  if (ui.btnCardSpeak) {
    ui.btnCardSpeak.addEventListener('click', () => {
      if (state.isSpeaking && !state.isMuted) {
        stopVoice();
      } else if (state.isAutoTour && state.isSpeaking && state.isMuted) {
        toggleMute();
      } else if (state.activeIndex === -2 && currentIntro) {
        state.isMuted = false;
        playNarration({
          audioKey: currentMonument ? `${currentMonument.id}/intro` : null,
          text: currentIntro.voiceover,
        });
      } else if (state.activeIndex >= 0 && currentPois[state.activeIndex]) {
        const poi = currentPois[state.activeIndex];
        state.isMuted = false;
        playNarration({
          audioKey: currentMonument ? `${currentMonument.id}/${poi.id}` : null,
          text: getPoiSpeechText(poi, state.activeIndex, currentPois.length),
        });
      }
    });
  }

  window.addEventListener('beforeunload', () => {
    if (narAudio) {
      try {
        narAudio.pause();
      } catch {
        // ignore
      }
    }
    if (hasSpeech) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
  });

  function update(dt) {
    if (!state.markersVisible || !markerObjects.length) return;
    state.elapsed += dt;
    markerObjects.forEach((m, idx) => {
      const isAct = idx === state.activeIndex || idx === state.hoveredIndex;
      m.group.position.y = m.baseY + Math.sin(state.elapsed * 2.1 + m.phase) * 0.28;
      m.core.rotation.y += dt * (isAct ? 2.2 : 1.1);
      m.ring.rotation.z -= dt * 0.9;
      const pulse = (isAct ? 1.25 : 1.0) + Math.sin(state.elapsed * 3.0 + m.phase) * 0.1;
      m.ring.scale.setScalar(pulse);
      m.sprite.scale.setScalar((isAct ? 3.5 : 2.6) + Math.sin(state.elapsed * 2.6 + m.phase) * 0.25);
    });
  }

  return {
    state,
    setMonumentTour,
    selectPoi,
    nextPoi,
    prevPoi,
    toggleAutoTourPlay,
    stopAutoTour,
    toggleMute,
    closePoiCard,
    setMarkersVisible,
    update,
  };
}
