import * as THREE from 'three';

/**
 * ============================================================================
 * SYSTÈME SOLAIRE PARIS 3D, DÔME CÉLESTE 9.5 KM & OMBRES DYNAMIQUES 4096×4096
 * Le frustum d'ombres suit dynamiquement le monument ou quartier exploré.
 * ============================================================================
 */

function createSkyDome() {
  const skyGeo = new THREE.SphereGeometry(9500, 32, 20);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTopColor: { value: new THREE.Color(0x2866b0) },
      uHorizonColor: { value: new THREE.Color(0xcde2f7) },
      uGroundColor: { value: new THREE.Color(0x9ca7b4) },
      uSunDir: { value: new THREE.Vector3(0.4, 0.7, 0.5).normalize() },
      uSunGlowColor: { value: new THREE.Color(0xffe1a6) },
      uSunGlowStrength: { value: 0.55 },
      uStarFactor: { value: 0.0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldDir;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldDir = normalize(position);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uTopColor;
      uniform vec3 uHorizonColor;
      uniform vec3 uGroundColor;
      uniform vec3 uSunDir;
      uniform vec3 uSunGlowColor;
      uniform float uSunGlowStrength;
      uniform float uStarFactor;
      varying vec3 vWorldDir;

      float hash(vec3 p) {
        p = fract(p * 0.3183099 + 0.1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }

      void main() {
        vec3 dir = normalize(vWorldDir);
        float h = dir.y;

        vec3 sky = mix(uHorizonColor, uTopColor, pow(clamp(h, 0.0, 1.0), 0.58));
        if (h < 0.0) {
          sky = mix(uHorizonColor, uGroundColor, clamp(-h * 4.0, 0.0, 1.0));
        }

        float sunCos = max(dot(dir, normalize(uSunDir)), 0.0);
        float halo = pow(sunCos, 10.0) * 0.45 * uSunGlowStrength;
        float corona = pow(sunCos, 96.0) * 0.85 * uSunGlowStrength;
        float disc = smoothstep(0.9986, 0.9994, sunCos) * 1.4 * clamp(uSunGlowStrength * 1.5, 0.0, 1.0);
        sky += uSunGlowColor * (halo + corona + disc);

        if (uStarFactor > 0.01 && h > 0.08) {
          vec3 grid = floor(dir * 260.0);
          float s = hash(grid);
          if (s > 0.9965) {
            float twinkle = (s - 0.9965) / 0.0035;
            sky += vec3(0.88, 0.92, 1.0) * twinkle * uStarFactor * smoothstep(0.08, 0.35, h);
          }
        }

        gl_FragColor = vec4(sky, 1.0);
      }
    `,
  });

  const dome = new THREE.Mesh(skyGeo, skyMat);
  dome.renderOrder = -1;
  return { dome, skyMat };
}

export function createLightingSystem(scene) {
  const { dome, skyMat } = createSkyDome();
  scene.add(dome);

  // Brume atmosphérique parisienne calibrée pour apercevoir la skyline sur 5–7 km
  const fog = new THREE.FogExp2(0xc9dff5, 0.00016);
  scene.fog = fog;

  const hemiLight = new THREE.HemisphereLight(0x9ec5f0, 0x6b5c4a, 0.72);
  scene.add(hemiLight);

  const ambientLight = new THREE.AmbientLight(0xd9d2c5, 0.24);
  scene.add(ambientLight);

  // --- SOLEIL PRINCIPAL (DirectionalLight haute précision suiveuse 2048×2048 par défaut) ---
  const sunLight = new THREE.DirectionalLight(0xfff1d6, 2.75);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 20;
  sunLight.shadow.camera.far = 1250;
  sunLight.shadow.camera.left = -165;
  sunLight.shadow.camera.right = 165;
  sunLight.shadow.camera.top = 165;
  sunLight.shadow.camera.bottom = -165;
  sunLight.shadow.bias = -0.00035;
  sunLight.shadow.normalBias = 0.06;
  sunLight.target.position.set(0, 8, 0);
  scene.add(sunLight);
  scene.add(sunLight.target);

  const focusCenter = new THREE.Vector3(0, 8, 0);
  const sunDirOffset = new THREE.Vector3(100, 120, 80);
  let sunDirty = true;
  let lastCellX = NaN;
  let lastCellZ = NaN;

  function setFocusCenter(centerVec3, shadowRadius = null) {
    focusCenter.copy(centerVec3);
    lastCellX = Math.round(centerVec3.x / 6) * 6;
    lastCellZ = Math.round(centerVec3.z / 6) * 6;
    sunLight.target.position.copy(focusCenter);
    sunLight.position.copy(focusCenter).add(sunDirOffset);

    if (shadowRadius !== null) {
      sunLight.shadow.camera.left = -shadowRadius;
      sunLight.shadow.camera.right = shadowRadius;
      sunLight.shadow.camera.top = shadowRadius;
      sunLight.shadow.camera.bottom = -shadowRadius;
      sunLight.shadow.camera.updateProjectionMatrix();
    }
    sunDirty = true;
  }

  function setShadowQuality({ mapSize = 2048, radius = 165, soft = true } = {}) {
    if (sunLight.shadow.mapSize.x !== mapSize || sunLight.shadow.mapSize.y !== mapSize) {
      sunLight.shadow.mapSize.set(mapSize, mapSize);
      if (sunLight.shadow.map) {
        sunLight.shadow.map.dispose();
        sunLight.shadow.map = null;
      }
    }
    sunLight.shadow.camera.left = -radius;
    sunLight.shadow.camera.right = radius;
    sunLight.shadow.camera.top = radius;
    sunLight.shadow.camera.bottom = -radius;
    sunLight.shadow.camera.updateProjectionMatrix();
    sunLight.shadow.radius = soft ? 1.4 : 0.7;
    sunDirty = true;
  }

  function updateShadowFocus(cameraPos) {
    const cx = Math.round(cameraPos.x / 6) * 6;
    const cz = Math.round(cameraPos.z / 6) * 6;
    const cy = Math.min(Math.max(0, cameraPos.y * 0.25), 45);
    if (cx !== lastCellX || cz !== lastCellZ || Math.abs(focusCenter.y - cy) > 4) {
      lastCellX = cx;
      lastCellZ = cz;
      focusCenter.set(cx, cy, cz);
      sunLight.target.position.copy(focusCenter);
      sunLight.position.copy(focusCenter).add(sunDirOffset);
      return true;
    }
    return false;
  }

  const keyframes = [
    {
      hour: 6.0,
      label: 'Aube',
      top: new THREE.Color(0x1f2f54),
      horizon: new THREE.Color(0xe68a5c),
      sunColor: new THREE.Color(0xff9b52),
      sunIntensity: 0.75,
      hemiSky: new THREE.Color(0xd9926c),
      hemiGround: new THREE.Color(0x3a322d),
      hemiIntensity: 0.48,
      ambientIntensity: 0.18,
      glowColor: new THREE.Color(0xff944d),
      glowStrength: 0.95,
      nightFactor: 0.62,
      glassGlow: 0.65,
    },
    {
      hour: 8.5,
      label: 'Matinée dorée',
      top: new THREE.Color(0x2c6eb8),
      horizon: new THREE.Color(0xdbe8f7),
      sunColor: new THREE.Color(0xffe1b0),
      sunIntensity: 2.35,
      hemiSky: new THREE.Color(0xb6d6f5),
      hemiGround: new THREE.Color(0x6e604f),
      hemiIntensity: 0.72,
      ambientIntensity: 0.24,
      glowColor: new THREE.Color(0xffe09c),
      glowStrength: 0.62,
      nightFactor: 0.12,
      glassGlow: 0.95,
    },
    {
      hour: 13.5,
      label: 'Zénith',
      top: new THREE.Color(0x1e5ca8),
      horizon: new THREE.Color(0xc5def5),
      sunColor: new THREE.Color(0xfff7e8),
      sunIntensity: 3.1,
      hemiSky: new THREE.Color(0xaed0f2),
      hemiGround: new THREE.Color(0x7c6f5e),
      hemiIntensity: 0.85,
      ambientIntensity: 0.28,
      glowColor: new THREE.Color(0xfff3d4),
      glowStrength: 0.45,
      nightFactor: 0.0,
      glassGlow: 1.15,
    },
    {
      hour: 17.5,
      label: "Fin d'après-midi",
      top: new THREE.Color(0x2a5f9e),
      horizon: new THREE.Color(0xf0c999),
      sunColor: new THREE.Color(0xffcf88),
      sunIntensity: 2.3,
      hemiSky: new THREE.Color(0xd6b99a),
      hemiGround: new THREE.Color(0x645546),
      hemiIntensity: 0.68,
      ambientIntensity: 0.23,
      glowColor: new THREE.Color(0xffbe6b),
      glowStrength: 0.75,
      nightFactor: 0.2,
      glassGlow: 1.0,
    },
    {
      hour: 20.0,
      label: 'Crépuscule',
      top: new THREE.Color(0x1e2c54),
      horizon: new THREE.Color(0xd9734a),
      sunColor: new THREE.Color(0xff7e3f),
      sunIntensity: 1.0,
      hemiSky: new THREE.Color(0x748cb5),
      hemiGround: new THREE.Color(0x544b42),
      hemiIntensity: 0.64,
      ambientIntensity: 0.28,
      glowColor: new THREE.Color(0xff6b2e),
      glowStrength: 1.05,
      nightFactor: 0.78,
      glassGlow: 0.58,
    },
    {
      hour: 22.0,
      label: 'Nuit parisienne',
      top: new THREE.Color(0x070d1c),
      horizon: new THREE.Color(0x15223d),
      sunColor: new THREE.Color(0x5274a8),
      sunIntensity: 0.22,
      hemiSky: new THREE.Color(0x22365c),
      hemiGround: new THREE.Color(0x17151a),
      hemiIntensity: 0.28,
      ambientIntensity: 0.12,
      glowColor: new THREE.Color(0x3a5482),
      glowStrength: 0.12,
      nightFactor: 1.0,
      glassGlow: 0.28,
    },
  ];

  const state = {
    hour: 15.5,
    isPlaying: false,
    speedHoursPerSec: 0.85,
    phaseLabel: 'Après-midi',
    nightFactor: 0.1,
    glassGlow: 1.0,
  };

  const cTop = new THREE.Color();
  const cHorizon = new THREE.Color();
  const cSun = new THREE.Color();
  const cHemiSky = new THREE.Color();
  const cHemiGround = new THREE.Color();
  const cGlow = new THREE.Color();

  function sampleKeyframes(hour) {
    const clamped = Math.max(6, Math.min(22, hour));
    let k0 = keyframes[0];
    let k1 = keyframes[keyframes.length - 1];
    for (let i = 0; i < keyframes.length - 1; i++) {
      if (clamped >= keyframes[i].hour && clamped <= keyframes[i + 1].hour) {
        k0 = keyframes[i];
        k1 = keyframes[i + 1];
        break;
      }
    }
    const span = Math.max(0.001, k1.hour - k0.hour);
    const t = (clamped - k0.hour) / span;
    const smooth = t * t * (3 - 2 * t);
    return { k0, k1, t: smooth };
  }

  function setTimeOfDay(hour) {
    state.hour = Math.max(6, Math.min(22, hour));
    const { k0, k1, t } = sampleKeyframes(state.hour);

    const solarProgress = (state.hour - 6.0) / 15.0;
    const angle = solarProgress * Math.PI;
    const elevation = Math.sin(Math.max(-0.08, Math.min(1.08, solarProgress)) * Math.PI) * (Math.PI * 0.33);
    const azimuth = angle;

    const sunDist = 480;
    const horiz = Math.cos(elevation) * sunDist;
    const sx = Math.cos(azimuth) * horiz;
    const sy = Math.max(45, Math.sin(elevation) * sunDist);
    const sz = Math.sin(azimuth) * horiz * 0.85 - (1 - Math.sin(angle)) * 45;

    sunDirOffset.set(sx, sy, sz);
    sunLight.position.copy(focusCenter).add(sunDirOffset);

    const trueSy = Math.sin(elevation) * sunDist;
    skyMat.uniforms.uSunDir.value.set(sx, trueSy, sz).normalize();

    cTop.copy(k0.top).lerp(k1.top, t);
    cHorizon.copy(k0.horizon).lerp(k1.horizon, t);
    cSun.copy(k0.sunColor).lerp(k1.sunColor, t);
    cHemiSky.copy(k0.hemiSky).lerp(k1.hemiSky, t);
    cHemiGround.copy(k0.hemiGround).lerp(k1.hemiGround, t);
    cGlow.copy(k0.glowColor).lerp(k1.glowColor, t);

    const sunInt = THREE.MathUtils.lerp(k0.sunIntensity, k1.sunIntensity, t);
    const hemiInt = THREE.MathUtils.lerp(k0.hemiIntensity, k1.hemiIntensity, t);
    const ambInt = THREE.MathUtils.lerp(k0.ambientIntensity, k1.ambientIntensity, t);
    const glowStr = THREE.MathUtils.lerp(k0.glowStrength, k1.glowStrength, t);
    state.nightFactor = THREE.MathUtils.lerp(k0.nightFactor, k1.nightFactor, t);
    state.glassGlow = THREE.MathUtils.lerp(k0.glassGlow, k1.glassGlow, t);

    skyMat.uniforms.uTopColor.value.copy(cTop);
    skyMat.uniforms.uHorizonColor.value.copy(cHorizon);
    skyMat.uniforms.uSunGlowColor.value.copy(cGlow);
    skyMat.uniforms.uSunGlowStrength.value = glowStr;
    skyMat.uniforms.uStarFactor.value = Math.max(0, (state.nightFactor - 0.55) / 0.45);

    fog.color.copy(cHorizon);
    sunLight.color.copy(cSun);
    sunLight.intensity = sunInt;
    hemiLight.color.copy(cHemiSky);
    hemiLight.groundColor.copy(cHemiGround);
    hemiLight.intensity = hemiInt;
    ambientLight.intensity = ambInt;

    if (state.hour < 7.2) state.phaseLabel = 'Aube dorée';
    else if (state.hour < 11.5) state.phaseLabel = 'Matinée';
    else if (state.hour < 15.0) state.phaseLabel = 'Zénith';
    else if (state.hour < 18.5) state.phaseLabel = 'Après-midi';
    else if (state.hour < 20.8) state.phaseLabel = 'Crépuscule';
    else state.phaseLabel = 'Nuit bleutée';

    sunDirty = true;
  }

  function formatHour(h) {
    const hrs = Math.floor(h);
    const mins = Math.round((h - hrs) * 60);
    const adjH = mins === 60 ? hrs + 1 : hrs;
    const adjM = mins === 60 ? 0 : mins;
    return `${String(adjH).padStart(2, '0')}h${String(adjM).padStart(2, '0')}`;
  }

  function syncToCamera(cameraPos) {
    dome.position.copy(cameraPos);
  }

  function update(dt) {
    if (state.isPlaying) {
      let next = state.hour + dt * state.speedHoursPerSec;
      if (next > 22.0) next = 6.0;
      setTimeOfDay(next);
      return true;
    }
    return false;
  }

  setTimeOfDay(state.hour);

  return {
    state,
    sunLight,
    setFocusCenter,
    setShadowQuality,
    updateShadowFocus,
    consumeSunDirty: () => {
      const d = sunDirty;
      sunDirty = false;
      return d;
    },
    setTimeOfDay,
    formatHour,
    syncToCamera,
    getSunDirection: () => skyMat.uniforms.uSunDir.value,
    update,
  };
}
