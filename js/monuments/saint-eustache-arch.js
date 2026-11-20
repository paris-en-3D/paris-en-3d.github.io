import * as THREE from 'three';
import { buildParisEnvironment } from './saint-eustache-env.js';
import { mergeStaticGroupByMaterial } from '../perf-manager.js';

/**
 * ============================================================================
 * TEXTURES PROCÉDURALES (CanvasTexture)
 * Pierre calcaire lutétienne, ardoise, chêne, dallage, vitraux, rosaces,
 * triptyque de Keith Haring et cadran solaire.
 * ============================================================================
 */

function createLimestoneTexture({
  baseColor = '#dfd3be',
  mortarColor = '#b7a98f',
  weathering = 0.16,
  repeatX = 4,
  repeatY = 4,
} = {}) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);

  // Appareillage en pierre de taille (assises régulières)
  const rows = 8;
  const cols = 4;
  const rowH = size / rows;
  const colW = size / cols;

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (colW * 0.5);
    for (let c = -1; c <= cols; c++) {
      const x = c * colW + offset;
      const y = r * rowH;
      const shade = (Math.sin(r * 13.7 + c * 29.3) * 0.5 + 0.5) * 18 - 9;
      ctx.fillStyle = shade >= 0
        ? `rgba(255, 250, 240, ${shade / 120})`
        : `rgba(85, 72, 55, ${-shade / 110})`;
      ctx.fillRect(x + 1, y + 1, colW - 2, rowH - 2);

      // Joints de mortier fins
      ctx.strokeStyle = mortarColor;
      ctx.lineWidth = 1.6;
      ctx.strokeRect(x, y, colW, rowH);
    }
  }

  // Grain minéral & patine parisienne
  for (let i = 0; i < 4200; i++) {
    const px = (i * 197) % size;
    const py = (i * 353 + Math.floor(i / 20) * 11) % size;
    const alpha = (i % 7) * 0.012 * weathering * 4;
    ctx.fillStyle = i % 2 === 0 ? `rgba(60,52,40,${alpha})` : `rgba(255,252,244,${alpha})`;
    ctx.fillRect(px, py, 2, 2);
  }

  // Légères coulures de pluie verticales
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, `rgba(65, 58, 48, ${weathering * 0.45})`);
  grad.addColorStop(0.35, 'rgba(65, 58, 48, 0)');
  grad.addColorStop(0.85, 'rgba(65, 58, 48, 0)');
  grad.addColorStop(1, `rgba(50, 45, 38, ${weathering * 0.55})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createSlateRoofTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#333d4b';
  ctx.fillRect(0, 0, size, size);

  const rows = 16;
  const cols = 12;
  const rowH = size / rows;
  const colW = size / cols;

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (colW * 0.5);
    for (let c = -1; c <= cols; c++) {
      const x = c * colW + offset;
      const y = r * rowH;
      const v = Math.sin(r * 19.1 + c * 7.3) * 14;
      const R = Math.max(30, Math.min(90, 52 + v));
      const G = Math.max(36, Math.min(100, 62 + v));
      const B = Math.max(46, Math.min(115, 76 + v));
      ctx.fillStyle = `rgb(${R | 0},${G | 0},${B | 0})`;
      ctx.fillRect(x + 1, y + 1, colW - 2, rowH - 1.5);
      ctx.fillStyle = 'rgba(15, 20, 28, 0.45)';
      ctx.fillRect(x, y + rowH - 2, colW, 2);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 4);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createFloorMarbleTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Dallage en pierre calcaire claire et pierre bleue-grise patinée (contraste doux anti-moiré)
  const tiles = 4;
  const step = size / tiles;
  for (let r = 0; r < tiles; r++) {
    for (let c = 0; c < tiles; c++) {
      const light = (r + c) % 2 === 0;
      const jitter = Math.sin(r * 11.3 + c * 17.7) * 5;
      if (light) {
        const v = (222 + jitter) | 0;
        ctx.fillStyle = `rgb(${v}, ${v - 7}, ${v - 19})`;
      } else {
        const v = (146 + jitter) | 0;
        ctx.fillStyle = `rgb(${v}, ${v - 3}, ${v - 7})`;
      }
      ctx.fillRect(c * step, r * step, step, step);
      ctx.strokeStyle = 'rgba(78, 72, 64, 0.24)';
      ctx.lineWidth = 2;
      ctx.strokeRect(c * step, r * step, step, step);
    }
  }

  // Veinage calcaire subtil
  ctx.strokeStyle = 'rgba(255, 250, 240, 0.12)';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 24; i++) {
    ctx.beginPath();
    ctx.moveTo((i * 41) % size, 0);
    ctx.bezierCurveTo((i * 83) % size, size * 0.35, (i * 19) % size, size * 0.7, (i * 67) % size, size);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  // Répétition calibrée pour les UV en mètres monde d'ExtrudeGeometry (~0.8m par dalle)
  tex.repeat.set(0.32, 0.32);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = 16;
  return tex;
}

function createCobbleTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#9c958a';
  ctx.fillRect(0, 0, size, size);

  const rows = 14;
  const cols = 10;
  const rowH = size / rows;
  const colW = size / cols;

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (colW * 0.5);
    for (let c = -1; c <= cols; c++) {
      const x = c * colW + offset;
      const y = r * rowH;
      const d = Math.sin(r * 17.3 + c * 31.7) * 11;
      const g = (162 + d) | 0;
      ctx.fillStyle = `rgb(${g + 5}, ${g + 1}, ${g - 6})`;
      ctx.fillRect(x + 2, y + 2, colW - 4, rowH - 4);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(42, 38);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  return tex;
}

function createWoodTexture(baseHex = '#5b3c25') {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 2) {
    const alpha = (Math.sin(y * 0.14) * 0.5 + 0.5) * 0.16;
    ctx.fillStyle = y % 4 === 0 ? `rgba(25, 14, 6, ${alpha})` : `rgba(180, 130, 80, ${alpha * 0.7})`;
    ctx.fillRect(0, y, size, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Vitraux réalistes de Saint-Eustache (512x1024) :
 * - 'nave' : Grisailles lumineuses en verre ancien losangé + bordures Renaissance dorées/rubis/cobalt
 *            + remplage gothique flamboyant (soufflets & mouchettes) dans le tympan.
 * - 'choir': Verrières figurées du Chœur (style Philippe de Champaigne, 1631) :
 *            3 lancettes à niches baroques, silhouettes de saints drapés, auréoles,
 *            verre soufflé nuagé, réseau de plombs fins et barlotières.
 */
function createStainedGlassTexture(variant = 'nave') {
  const w = 512;
  const h = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Fond sombre d'encadrement ogival en pierre
  ctx.fillStyle = '#3b3630';
  ctx.fillRect(0, 0, w, h);

  // Masque en arc brisé (lancette gothique)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(14, h - 10);
  ctx.lineTo(14, 240);
  ctx.quadraticCurveTo(14, 52, w * 0.5, 14);
  ctx.quadraticCurveTo(w - 14, 52, w - 14, 240);
  ctx.lineTo(w - 14, h - 10);
  ctx.closePath();
  ctx.clip();

  if (variant === 'nave') {
    // 1. Verre clair en grisaille ancienne (ton ivoire/champagne/bleu-gris très lumineux)
    const baseGrad = ctx.createLinearGradient(0, 0, 0, h);
    baseGrad.addColorStop(0, '#f7eccf');
    baseGrad.addColorStop(0.35, '#ebe2ce');
    baseGrad.addColorStop(0.75, '#e2dac6');
    baseGrad.addColorStop(1, '#d5ccb8');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Vitrerie losangée ancienne (carreaux de verre soufflé à légères nuances individuelles)
    const step = 28;
    for (let y = 220; y < h + step; y += step) {
      for (let x = -step; x < w + step; x += step) {
        const seed = Math.sin(x * 0.19 + y * 0.31);
        const warm = seed > 0 ? `rgba(248, 224, 168, ${0.14 + seed * 0.14})` : `rgba(176, 198, 214, ${0.12 - seed * 0.12})`;
        ctx.fillStyle = warm;
        ctx.beginPath();
        ctx.moveTo(x, y - step * 0.5);
        ctx.lineTo(x + step * 0.5, y);
        ctx.lineTo(x, y + step * 0.5);
        ctx.lineTo(x - step * 0.5, y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(42, 38, 34, 0.52)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
    }

    // 3. Trois lancettes avec bordures Renaissance polychromes (or, bleu lapis, rubis)
    const lancetW = (w - 36) / 3;
    for (let l = 0; l < 3; l++) {
      const lx = 18 + l * lancetW;
      // Liseré doré et rubis/cobalt en bordure de chaque lancette
      ctx.strokeStyle = '#c8922d';
      ctx.lineWidth = 11;
      ctx.strokeRect(lx + 10, 268, lancetW - 20, h - 290);
      ctx.strokeStyle = l === 1 ? '#8c2230' : '#244b85';
      ctx.lineWidth = 5;
      ctx.strokeRect(lx + 17, 275, lancetW - 34, h - 304);

      // Médaillon Renaissance délicat au tiers supérieur et inférieur de chaque lancette
      [440, 740].forEach((my, mIdx) => {
        const mx = lx + lancetW * 0.5;
        ctx.beginPath();
        ctx.arc(mx, my, 32, 0, Math.PI * 2);
        ctx.fillStyle = mIdx === 0 ? '#2a5696' : '#9c2c38';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#25211e';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(mx, my, 21, 0, Math.PI * 2);
        ctx.fillStyle = '#e5b852';
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(mx, my, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#f8ecd0';
        ctx.fill();
      });

      // Arc trilobé en sommet de lancette
      ctx.beginPath();
      ctx.arc(lx + lancetW * 0.5, 272, lancetW * 0.42, Math.PI, 0);
      ctx.strokeStyle = '#2b2723';
      ctx.lineWidth = 8;
      ctx.stroke();
    }

    // 4. Tympan gothique flamboyant (rosace dorée + soufflets rubis & saphir)
    const tympGrad = ctx.createRadialGradient(w * 0.5, 138, 12, w * 0.5, 138, 135);
    tympGrad.addColorStop(0, '#fae08c');
    tympGrad.addColorStop(0.5, '#c9882c');
    tympGrad.addColorStop(1, '#23467d');
    ctx.fillStyle = tympGrad;
    ctx.fillRect(0, 0, w, 255);

    // Rose supérieure flamboyante
    ctx.beginPath();
    ctx.arc(w * 0.5, 128, 62, 0, Math.PI * 2);
    ctx.fillStyle = '#f2c35a';
    ctx.fill();
    ctx.lineWidth = 9;
    ctx.strokeStyle = '#332e29';
    ctx.stroke();

    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(w * 0.5 + Math.cos(a) * 34, 128 + Math.sin(a) * 34, 16, 0, Math.PI * 2);
      ctx.fillStyle = k % 2 === 0 ? '#a62634' : '#225194';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#1e1b18';
      ctx.stroke();
    }

    // Deux écoinçons latéraux en soufflets
    [118, w - 118].forEach((ex) => {
      ctx.beginPath();
      ctx.arc(ex, 205, 34, 0, Math.PI * 2);
      ctx.fillStyle = '#992736';
      ctx.fill();
      ctx.lineWidth = 7;
      ctx.strokeStyle = '#332e29';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ex, 205, 15, 0, Math.PI * 2);
      ctx.fillStyle = '#f4d072';
      ctx.fill();
    });
  } else {
    // === VERRIÈRES DU CHŒUR (Philippe de Champaigne, 1631) ===
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#16356b');
    skyGrad.addColorStop(0.28, '#265394');
    skyGrad.addColorStop(0.55, '#8c693a');
    skyGrad.addColorStop(1, '#3b2420');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // 3 lancettes à figures monumentales de saints sous dais dorés Renaissance
    const lancetW = (w - 36) / 3;
    const robeColors = [
      { outer: '#9e1f2d', inner: '#e0a93b' }, // Pourpre & or
      { outer: '#1d4c8f', inner: '#c4313e' }, // Lapis & carmin
      { outer: '#1c634d', inner: '#dca83e' }, // Émeraude & or
    ];

    for (let l = 0; l < 3; l++) {
      const lx = 18 + l * lancetW;
      const cx = lx + lancetW * 0.5;
      const pal = robeColors[l];

      // Fond de niche bleu céleste lumineux
      const nicheGrad = ctx.createLinearGradient(lx, 260, lx, 960);
      nicheGrad.addColorStop(0, '#2a5ea8');
      nicheGrad.addColorStop(0.45, '#5982b8');
      nicheGrad.addColorStop(0.82, '#c9a66b');
      nicheGrad.addColorStop(1, '#4a3526');
      ctx.fillStyle = nicheGrad;
      ctx.fillRect(lx + 8, 270, lancetW - 16, 710);

      // Dais architectural baroque doré au-dessus du saint
      ctx.fillStyle = '#e2b659';
      ctx.beginPath();
      ctx.moveTo(lx + 14, 395);
      ctx.lineTo(lx + 14, 330);
      ctx.quadraticCurveTo(cx, 265, lx + lancetW - 14, 330);
      ctx.lineTo(lx + lancetW - 14, 395);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#2d2116';
      ctx.stroke();

      // Colonnettes latérales peintes en trompe-l'œil
      ctx.fillStyle = '#c89b44';
      ctx.fillRect(lx + 12, 390, 14, 520);
      ctx.fillRect(lx + lancetW - 26, 390, 14, 520);

      // Auréole rayonnante
      ctx.beginPath();
      ctx.arc(cx, 488, 36, 0, Math.PI * 2);
      ctx.fillStyle = '#f8d778';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#332312';
      ctx.stroke();

      // Tête & visage peint en grisaille
      ctx.beginPath();
      ctx.arc(cx, 492, 19, 0, Math.PI * 2);
      ctx.fillStyle = '#f0d7ba';
      ctx.fill();
      ctx.stroke();

      // Manteau drapé baroque du saint (couleurs riches avec plis ombrés)
      ctx.beginPath();
      ctx.moveTo(cx - 34, 526);
      ctx.quadraticCurveTo(cx, 514, cx + 34, 526);
      ctx.lineTo(cx + 46, 860);
      ctx.lineTo(cx - 46, 860);
      ctx.closePath();
      ctx.fillStyle = pal.outer;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#1b1615';
      ctx.stroke();

      // Tunique intérieure & plis de draperie
      ctx.beginPath();
      ctx.moveTo(cx - 16, 540);
      ctx.lineTo(cx + 20, 560);
      ctx.lineTo(cx + 12, 856);
      ctx.lineTo(cx - 24, 856);
      ctx.closePath();
      ctx.fillStyle = pal.inner;
      ctx.fill();
      ctx.stroke();

      // Piédestal inscrit en bas
      ctx.fillStyle = '#d4b47c';
      ctx.fillRect(lx + 18, 864, lancetW - 36, 98);
      ctx.strokeRect(lx + 18, 864, lancetW - 36, 98);
    }

    // Tympan flamboyant glorieux (soleil d'or et gloire céleste)
    const gloria = ctx.createRadialGradient(w * 0.5, 130, 8, w * 0.5, 130, 125);
    gloria.addColorStop(0, '#fff2b0');
    gloria.addColorStop(0.45, '#e8a832');
    gloria.addColorStop(0.85, '#9e2230');
    gloria.addColorStop(1, '#1c3e7a');
    ctx.fillStyle = gloria;
    ctx.beginPath();
    ctx.arc(w * 0.5, 130, 118, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(w * 0.5, 130, 62, 0, Math.PI * 2);
    ctx.lineWidth = 9;
    ctx.strokeStyle = '#2c2722';
    ctx.stroke();
  }

  // Réseau fin de plombs (cames) & texture de verre ancien soufflé
  ctx.strokeStyle = 'rgba(22, 19, 17, 0.45)';
  ctx.lineWidth = 1.6;
  for (let y = 280; y < h; y += 44) {
    ctx.beginPath();
    ctx.moveTo(14, y);
    ctx.lineTo(w - 14, y);
    ctx.stroke();
  }

  // 2 meneaux verticaux majeurs en pierre sombre + barlotières en fer forgé
  const lancetStep = (w - 36) / 3;
  ctx.fillStyle = '#332e28';
  ctx.fillRect(18 + lancetStep - 6, 240, 12, h - 240);
  ctx.fillRect(18 + lancetStep * 2 - 6, 240, 12, h - 240);
  // Barlotières horizontales métalliques
  ctx.fillStyle = 'rgba(20, 18, 16, 0.72)';
  for (let by = 320; by < h; by += 112) {
    ctx.fillRect(14, by, w - 28, 4);
  }

  // Patine douce sur les bords des pièces (effet grisaille / verre ancien)
  const vig = ctx.createRadialGradient(w * 0.5, h * 0.48, w * 0.15, w * 0.5, h * 0.5, h * 0.58);
  vig.addColorStop(0, 'rgba(255, 248, 225, 0.08)');
  vig.addColorStop(1, 'rgba(28, 22, 16, 0.28)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  ctx.restore();

  // Contour ogival mouluré en pierre
  ctx.beginPath();
  ctx.moveTo(14, h - 10);
  ctx.lineTo(14, 240);
  ctx.quadraticCurveTo(14, 52, w * 0.5, 14);
  ctx.quadraticCurveTo(w - 14, 52, w - 14, 240);
  ctx.lineTo(w - 14, h - 10);
  ctx.closePath();
  ctx.lineWidth = 16;
  ctx.strokeStyle = '#4b443b';
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Grande Rosace Gothique Flamboyant (1024x1024) :
 * 12 pétales rayonnants, couronne de soufflets/mouchettes sinueuses,
 * verre ancien nuagé et réseau de plombs réaliste.
 */
function createRoseWindowTexture() {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.47;

  ctx.fillStyle = '#25211e';
  ctx.fillRect(0, 0, size, size);

  // Fond lumineux rayonnant
  const bg = ctx.createRadialGradient(cx, cy, R * 0.04, cx, cy, R);
  bg.addColorStop(0, '#fff0b2');
  bg.addColorStop(0.22, '#e2a332');
  bg.addColorStop(0.55, '#204d94');
  bg.addColorStop(0.82, '#961e30');
  bg.addColorStop(1, '#1a3869');
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = bg;
  ctx.fill();

  const spokes = 12;
  const outerPalette = ['#1d4c92', '#9e2132', '#d99a2e', '#1d6958', '#523482', '#b8422b'];
  const midPalette = ['#e5ae3c', '#2356a4', '#a82536', '#21705d'];

  // Couronne extérieure : 24 lobes flamboyants (soufflets en flammes)
  for (let i = 0; i < spokes * 2; i++) {
    const a = (i / (spokes * 2)) * Math.PI * 2;
    const rx = cx + Math.cos(a) * (R * 0.81);
    const ry = cy + Math.sin(a) * (R * 0.81);
    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(-R * 0.14, 0);
    ctx.quadraticCurveTo(0, -R * 0.085, R * 0.14, 0);
    ctx.quadraticCurveTo(0, R * 0.085, -R * 0.14, 0);
    ctx.closePath();
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, R * 0.13);
    g.addColorStop(0, '#ffe696');
    g.addColorStop(0.35, outerPalette[i % outerPalette.length]);
    g.addColorStop(1, '#181924');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#2d2824';
    ctx.stroke();
    ctx.restore();
  }

  // Couronne médiane : 12 grands pétales trilobés
  for (let i = 0; i < spokes; i++) {
    const a0 = (i / spokes) * Math.PI * 2;
    const aMid = ((i + 0.5) / spokes) * Math.PI * 2;
    const a1 = ((i + 1) / spokes) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a0) * R * 0.22, cy + Math.sin(a0) * R * 0.22);
    ctx.arc(cx, cy, R * 0.64, a0, a1);
    ctx.lineTo(cx + Math.cos(a1) * R * 0.22, cy + Math.sin(a1) * R * 0.22);
    ctx.closePath();

    const px = cx + Math.cos(aMid) * R * 0.44;
    const py = cy + Math.sin(aMid) * R * 0.44;
    const pg = ctx.createRadialGradient(px, py, 6, px, py, R * 0.24);
    pg.addColorStop(0, '#fbe192');
    pg.addColorStop(0.45, midPalette[i % midPalette.length]);
    pg.addColorStop(1, '#1b1d28');
    ctx.fillStyle = pg;
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#332d27';
    ctx.stroke();

    // Médaillon quadrilobé dans chaque pétale
    ctx.beginPath();
    ctx.arc(cx + Math.cos(aMid) * R * 0.48, cy + Math.sin(aMid) * R * 0.48, R * 0.082, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 === 0 ? '#a82230' : '#21539e';
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#25201c';
    ctx.stroke();
  }

  // Cœur solaire central finement plombé
  const coreG = ctx.createRadialGradient(cx, cy, 8, cx, cy, R * 0.22);
  coreG.addColorStop(0, '#fff7cc');
  coreG.addColorStop(0.55, '#eab33e');
  coreG.addColorStop(1, '#9c222e');
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = coreG;
  ctx.fill();
  ctx.lineWidth = 12;
  ctx.strokeStyle = '#352f29';
  ctx.stroke();

  // Anneaux concentriques de remplage en pierre
  [R * 0.99, R * 0.66, R * 0.22].forEach((rad, idx) => {
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.lineWidth = idx === 0 ? 18 : 12;
    ctx.strokeStyle = '#3a342e';
    ctx.stroke();
  });

  // Fine résille de plombs rayonnants
  ctx.strokeStyle = 'rgba(20, 17, 15, 0.55)';
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * R * 0.22, cy + Math.sin(a) * R * 0.22);
    ctx.lineTo(cx + Math.cos(a) * R * 0.98, cy + Math.sin(a) * R * 0.98);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Texture procédurale de façade d'immeuble Haussmannien parisien (Quartier des Halles / Châtelet) :
 * pierre de taille blonde, 5 étages de fenêtres à volets, balcons filants en fer forgé,
 * rez-de-chaussée de brasseries parisiennes à auvents bordeaux/vert foncé.
 */
function createHaussmannFacadeTexture({ awningColor = '#6b1d28', stoneTone = '#ddd2be' } = {}) {
  const w = 512;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Pierre de taille parisienne
  ctx.fillStyle = stoneTone;
  ctx.fillRect(0, 0, w, h);

  // Assises horizontales de pierre
  ctx.strokeStyle = 'rgba(130, 118, 98, 0.26)';
  ctx.lineWidth = 1.5;
  for (let y = 0; y < h; y += 22) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Rez-de-chaussée commerçant / brasserie parisienne (bas du canvas)
  ctx.fillStyle = '#3c3834';
  ctx.fillRect(0, h - 106, w, 106);

  // Vitrines chaudes de café/brasserie
  const cols = 4;
  const colW = w / cols;
  for (let c = 0; c < cols; c++) {
    const wx = c * colW + 14;
    const g = ctx.createLinearGradient(0, h - 88, 0, h - 10);
    g.addColorStop(0, '#4f4335');
    g.addColorStop(0.55, '#8c6e46');
    g.addColorStop(1, '#302720');
    ctx.fillStyle = g;
    ctx.fillRect(wx, h - 86, colW - 28, 76);
    ctx.strokeStyle = '#c4a66a';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(wx, h - 86, colW - 28, 76);

    // Auvent de brasserie (bordeaux ou vert bouteille)
    ctx.fillStyle = awningColor;
    ctx.fillRect(wx - 4, h - 100, colW - 20, 18);
    ctx.fillStyle = 'rgba(255, 240, 200, 0.55)';
    ctx.fillRect(wx - 4, h - 85, colW - 20, 3);
  }

  // 4 étages haussmanniens de fenêtres françaises avec volets & balcons fer forgé
  const floorYs = [22, 114, 206, 298];
  floorYs.forEach((fy, fIdx) => {
    // Corniche de pierre & balcon filant au 2e (fIdx=2) et 5e étage (fIdx=0)
    if (fIdx === 0 || fIdx === 2) {
      ctx.fillStyle = '#c9bda7';
      ctx.fillRect(0, fy + 68, w, 9);
    }

    for (let c = 0; c < cols; c++) {
      const cx = c * colW + colW * 0.5;
      // Encadrement pierre mouluré
      ctx.fillStyle = '#ece3d2';
      ctx.fillRect(cx - 28, fy - 4, 56, 72);

      // Volets parisiens gris clair entrouverts
      ctx.fillStyle = '#9aa1a8';
      ctx.fillRect(cx - 35, fy, 10, 64);
      ctx.fillRect(cx + 25, fy, 10, 64);

      // Vitre sombre bleutée avec reflet ciel
      const wg = ctx.createLinearGradient(cx - 22, fy, cx + 22, fy + 64);
      wg.addColorStop(0, '#364a62');
      wg.addColorStop(0.5, '#1f2b3a');
      wg.addColorStop(1, '#314050');
      ctx.fillStyle = wg;
      ctx.fillRect(cx - 22, fy + 2, 44, 62);

      // Petits bois blancs des croisées françaises
      ctx.strokeStyle = '#dfd8cc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, fy + 2);
      ctx.lineTo(cx, fy + 64);
      ctx.moveTo(cx - 22, fy + 24);
      ctx.lineTo(cx + 22, fy + 24);
      ctx.moveTo(cx - 22, fy + 44);
      ctx.lineTo(cx + 22, fy + 44);
      ctx.stroke();

      // Garde-corps individuel en fer forgé noir
      ctx.strokeStyle = '#1f2226';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - 24, fy + 48, 48, 17);
    }

    // Balcon filant en fer forgé noir
    if (fIdx === 0 || fIdx === 2) {
      ctx.strokeStyle = '#1d2024';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, fy + 50);
      ctx.lineTo(w, fy + 50);
      ctx.moveTo(0, fy + 67);
      ctx.lineTo(w, fy + 67);
      for (let bx = 6; bx < w; bx += 12) {
        ctx.moveTo(bx, fy + 50);
        ctx.lineTo(bx, fy + 67);
      }
      ctx.stroke();
    }
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createGravelTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#cfc3aa';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 3500; i++) {
    const x = (i * 137) % size;
    const y = (i * 293 + Math.floor(i / 15) * 7) % size;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(255,250,238,0.35)' : 'rgba(120,108,88,0.28)';
    ctx.fillRect(x, y, 2, 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createKeithHaringTriptychTexture() {
  const w = 512;
  const h = 384;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Bronze recouvert d'or blanc (éclat doré champagne très lumineux)
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#efe1b4');
  bg.addColorStop(0.5, '#d8be78');
  bg.addColorStop(1, '#c4a45a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Texture martelée subtile
  for (let i = 0; i < 600; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,250,235,0.14)' : 'rgba(90,70,25,0.12)';
    ctx.beginPath();
    ctx.arc((i * 73) % w, (i * 41) % h, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Motifs expressifs en relief stylisé (hommage à "La Vie du Christ", 1990)
  ctx.strokeStyle = '#6b5320';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Rayons solaires autour de la figure centrale
  const cx = w * 0.5;
  const cy = h * 0.42;
  ctx.lineWidth = 7;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 58, cy + Math.sin(a) * 58);
    ctx.lineTo(cx + Math.cos(a) * 112, cy + Math.sin(a) * 112);
    ctx.stroke();
  }

  // Figure rayonnante centrale stylisée
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(cx, cy - 22, 24, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy + 4);
  ctx.lineTo(cx, cy + 88);
  ctx.moveTo(cx - 56, cy + 28);
  ctx.lineTo(cx + 56, cy + 28);
  ctx.moveTo(cx, cy + 88);
  ctx.lineTo(cx - 32, cy + 135);
  ctx.moveTo(cx, cy + 88);
  ctx.lineTo(cx + 32, cy + 135);
  ctx.stroke();

  // Silhouettes dansantes et anges stylisés sur les côtés
  [0.18, 0.82].forEach((fx) => {
    const x = w * fx;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(x, h * 0.34, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, h * 0.40);
    ctx.lineTo(x, h * 0.65);
    ctx.moveTo(x - 32, h * 0.46);
    ctx.quadraticCurveTo(x, h * 0.54, x + 32, h * 0.42);
    ctx.moveTo(x, h * 0.65);
    ctx.lineTo(x - 24, h * 0.82);
    ctx.moveTo(x, h * 0.65);
    ctx.lineTo(x + 24, h * 0.82);
    ctx.stroke();
  });

  // Bordure de cadre en bronze doré
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#7e6329';
  ctx.strokeRect(7, 7, w - 14, h - 14);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSundialTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#e7ddc9';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = '#a47d32';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, size - 16, size - 16);

  // Rayons solaires dorés depuis le gnomon supérieur
  const gx = size * 0.5;
  const gy = size * 0.22;
  ctx.strokeStyle = '#9c7224';
  ctx.lineWidth = 2.5;
  for (let i = -5; i <= 5; i++) {
    const a = Math.PI * 0.5 + i * 0.23;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + Math.cos(a) * 185, gy + Math.sin(a) * 185);
    ctx.stroke();
  }

  // Soleil doré
  ctx.fillStyle = '#d9a43b';
  ctx.beginPath();
  ctx.arc(gx, gy, 18, 0, Math.PI * 2);
  ctx.fill();

  // Chiffres romains
  ctx.fillStyle = '#3e2f14';
  ctx.font = 'bold 18px Georgia, serif';
  ctx.textAlign = 'center';
  const labels = ['VIII', 'X', 'XII', 'II', 'IV'];
  labels.forEach((lbl, idx) => {
    ctx.fillText(lbl, 38 + idx * 45, size - 26);
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * ============================================================================
 * CONSTRUCTION ARCHITECTURALE DE L'ÉGLISE SAINT-EUSTACHE (~105m x 43m x 33.5m)
 * Repère :
 *   -X = Ouest (Façade classique de Hardouin-Mansart de Jouy)
 *   +X = Est   (Chœur, Chevet & Chapelle de la Vierge)
 *   -Z = Nord  (Tour Nord achevée, Triptyque Keith Haring, Tombeau Colbert)
 *   +Z = Sud   (Tour Sud inachevée, Transept Sud, Jardin Nelson-Mandela)
 * ============================================================================
 */
export function buildSaintEustache(scene) {
  const root = new THREE.Group();
  root.name = 'SaintEustacheRoot';
  scene.add(root);

  // Séparation stricte Extérieur + Enveloppe (toujours visibles en LOD 0/1) vs Mobilier & Sculptures Intérieures (LOD 0 uniquement)
  const exteriorGroup = new THREE.Group();
  exteriorGroup.name = 'SaintEustacheExterior';
  exteriorGroup.userData.keepGroup = true;
  root.add(exteriorGroup);

  const interiorDetailGroup = new THREE.Group();
  interiorDetailGroup.name = 'SaintEustacheInterior';
  interiorDetailGroup.userData.keepGroup = true;
  root.add(interiorDetailGroup);

  const colliders = []; // AABB { minX, maxX, minZ, maxZ }
  const circleColliders = []; // { x, z, r }
  const stainedGlassMaterials = [];
  const streetLampEmissives = [];

  // --- MATÉRIAUX PARTAGÉS ---
  const texExtStone = createLimestoneTexture({ baseColor: '#dfd1b8', mortarColor: '#b3a388', weathering: 0.22, repeatX: 3, repeatY: 3 });
  const texExtStoneFine = createLimestoneTexture({ baseColor: '#e4d8c3', mortarColor: '#baa98e', weathering: 0.14, repeatX: 1, repeatY: 2 });
  const texIntStone = createLimestoneTexture({ baseColor: '#e8dfd0', mortarColor: '#c9beaa', weathering: 0.08, repeatX: 2, repeatY: 3 });
  const texSlate = createSlateRoofTexture();
  const texFloor = createFloorMarbleTexture();
  const texCobble = createCobbleTexture();
  const texWoodDark = createWoodTexture('#4c311e');
  const texWoodOrgan = createWoodTexture('#6b4528');
  const texStainedNave = createStainedGlassTexture('nave');
  const texStainedChoir = createStainedGlassTexture('choir');
  const texRose = createRoseWindowTexture();
  const texHaring = createKeithHaringTriptychTexture();
  const texSundial = createSundialTexture();

  const matStoneExt = new THREE.MeshStandardMaterial({
    map: texExtStone,
    roughness: 0.86,
    metalness: 0.03,
  });
  const matStoneFacade = new THREE.MeshStandardMaterial({
    map: texExtStoneFine,
    roughness: 0.82,
    metalness: 0.04,
  });
  const matStoneInt = new THREE.MeshStandardMaterial({
    map: texIntStone,
    roughness: 0.84,
    metalness: 0.02,
  });
  const matStoneIntDouble = matStoneInt.clone();
  matStoneIntDouble.side = THREE.DoubleSide;
  const matStoneTrim = new THREE.MeshStandardMaterial({
    color: 0xd9ccb4,
    roughness: 0.78,
    metalness: 0.05,
  });
  const matSlate = new THREE.MeshStandardMaterial({
    map: texSlate,
    roughness: 0.62,
    metalness: 0.18,
  });
  const matLead = new THREE.MeshStandardMaterial({
    color: 0x5c646d,
    roughness: 0.5,
    metalness: 0.45,
  });
  const matCopperPatina = new THREE.MeshStandardMaterial({
    color: 0x4b7467,
    roughness: 0.48,
    metalness: 0.35,
  });
  const matGold = new THREE.MeshStandardMaterial({
    color: 0xd9a84e,
    roughness: 0.32,
    metalness: 0.82,
  });
  const matTinPipes = new THREE.MeshStandardMaterial({
    color: 0xcfd4d9,
    roughness: 0.28,
    metalness: 0.88,
  });
  const matWoodDark = new THREE.MeshStandardMaterial({
    map: texWoodDark,
    roughness: 0.72,
    metalness: 0.06,
  });
  const matWoodOrgan = new THREE.MeshStandardMaterial({
    map: texWoodOrgan,
    roughness: 0.64,
    metalness: 0.08,
  });
  const matMarbleWhite = new THREE.MeshStandardMaterial({
    color: 0xf4f0e8,
    roughness: 0.3,
    metalness: 0.05,
  });
  const matMarbleBlack = new THREE.MeshStandardMaterial({
    color: 0x1c1d22,
    roughness: 0.25,
    metalness: 0.15,
  });
  const matFloor = new THREE.MeshStandardMaterial({
    map: texFloor,
    roughness: 0.45,
    metalness: 0.06,
  });

  const matGlassNave = new THREE.MeshStandardMaterial({
    map: texStainedNave,
    emissiveMap: texStainedNave,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.85,
    transparent: true,
    opacity: 0.84,
    roughness: 0.22,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });
  const matGlassChoir = new THREE.MeshStandardMaterial({
    map: texStainedChoir,
    emissiveMap: texStainedChoir,
    emissive: new THREE.Color(0xfff1d0),
    emissiveIntensity: 1.05,
    transparent: true,
    opacity: 0.86,
    roughness: 0.2,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });
  const matGlassRose = new THREE.MeshStandardMaterial({
    map: texRose,
    emissiveMap: texRose,
    emissive: new THREE.Color(0xffebd0),
    emissiveIntensity: 1.0,
    transparent: true,
    opacity: 0.88,
    roughness: 0.2,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });
  stainedGlassMaterials.push(matGlassNave, matGlassChoir, matGlassRose);

  // --- UTILITAIRES GÉOMÉTRIQUES ---
  function addBox(w, h, d, x, y, z, mat = matStoneExt, { cast = true, receive = true, collide = false, parent = exteriorGroup } = {}) {
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

  function addCylinder(rt, rb, h, seg, x, y, z, mat = matStoneFacade, { cast = true, receive = true, parent = exteriorGroup } = {}) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    parent.add(mesh);
    return mesh;
  }

  // Arc gothique/Renaissance discret (voussoirs)
  function addArchSpan(p1, p2, springY, rise, thickness, depth, mat = matStoneInt, parent = exteriorGroup) {
    const dx = p2.x - p1.x;
    const dz = p2.z - p1.z;
    const span = Math.hypot(dx, dz);
    const angleY = Math.atan2(dz, dx);
    const group = new THREE.Group();
    group.position.set((p1.x + p2.x) * 0.5, springY, (p1.z + p2.z) * 0.5);
    group.rotation.y = -angleY;

    const segs = 10;
    for (let i = 0; i < segs; i++) {
      const t0 = i / segs;
      const t1 = (i + 1) / segs;
      const a0 = Math.PI * (1 - t0);
      const a1 = Math.PI * (1 - t1);
      // Légère pointe gothique au sommet
      const x0 = Math.cos(a0) * (span * 0.5);
      const y0 = Math.sin(a0) * rise + (1 - Math.abs(t0 - 0.5) * 2) * (rise * 0.14);
      const x1 = Math.cos(a1) * (span * 0.5);
      const y1 = Math.sin(a1) * rise + (1 - Math.abs(t1 - 0.5) * 2) * (rise * 0.14);

      const segLen = Math.hypot(x1 - x0, y1 - y0) + 0.08;
      const segAngle = Math.atan2(y1 - y0, x1 - x0);
      const segMesh = new THREE.Mesh(new THREE.BoxGeometry(segLen, thickness, depth), mat);
      segMesh.position.set((x0 + x1) * 0.5, (y0 + y1) * 0.5, 0);
      segMesh.rotation.z = segAngle;
      segMesh.castShadow = true;
      segMesh.receiveShadow = true;
      group.add(segMesh);
    }
    parent.add(group);
    return group;
  }

  // Pilier fasciculé (nervures gothiques + chapiteaux Renaissance superposés)
  function addCompoundPier(x, z, height, radius = 0.82, registerCollider = true) {
    const g = new THREE.Group();
    g.position.set(x, 0.4, z);

    // Socle octogonal mouluré
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.24, radius * 1.32, 1.4, 8), matStoneTrim);
    plinth.position.y = 0.7;
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    g.add(plinth);

    // Fût principal
    const core = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.85, radius * 0.92, height - 1.4, 12), matStoneInt);
    core.position.y = 1.4 + (height - 1.4) * 0.5;
    core.castShadow = true;
    core.receiveShadow = true;
    g.add(core);

    // 4 colonnettes / pilastres engagés (mélange gothique-Renaissance)
    const shaftGeo = new THREE.CylinderGeometry(radius * 0.28, radius * 0.3, height - 1.5, 8);
    const offsets = [
      [radius * 0.78, 0],
      [-radius * 0.78, 0],
      [0, radius * 0.78],
      [0, -radius * 0.78],
    ];
    offsets.forEach(([ox, oz]) => {
      const shaft = new THREE.Mesh(shaftGeo, matStoneTrim);
      shaft.position.set(ox, 1.4 + (height - 1.5) * 0.5, oz);
      shaft.castShadow = true;
      shaft.receiveShadow = true;
      g.add(shaft);
    });

    // Chapiteaux Renaissance étagés (niveaux grandes arcades et départ des voûtes)
    const capLevels = height > 19 ? [14.0, 17.5, height - 0.45] : [height - 0.45];
    capLevels.forEach((cy) => {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(radius * 2.35, 0.72, radius * 2.35), matStoneTrim);
      cap.position.y = cy;
      cap.castShadow = true;
      cap.receiveShadow = true;
      g.add(cap);
    });

    exteriorGroup.add(g);
    if (registerCollider) {
      circleColliders.push({ x, z, r: radius * 1.25 });
    }
    return g;
  }

  // Travée de voûte sur croisées d'ogives + clé pendante Renaissance
  // axis: 'x' (Nef & Chœur, axe longitudinal Est-Ouest) ou 'z' (Bras du Transept, axe Nord-Sud)
  function addRibbedVaultBay(cx, cz, spanX, spanZ, springY, crownY, withPendant = true, axis = 'x') {
    const g = new THREE.Group();
    g.position.set(cx, 0, cz);
    if (axis === 'z') {
      g.rotation.y = Math.PI * 0.5;
    }

    const len = axis === 'z' ? spanZ : spanX;
    const width = axis === 'z' ? spanX : spanZ;
    const rise = crownY - springY;
    const r = width * 0.5;

    // Voûtain supérieur : demi-cylindre courbé vers le HAUT (+Y) après rotation.z = +PI/2
    // Dans CylinderGeometry, theta ∈ [0, PI] donne sin(theta) >= 0 (local +X -> monde +Y)
    const shell = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, len + 0.1, 16, 1, true, 0, Math.PI),
      matStoneIntDouble
    );
    shell.rotation.z = Math.PI * 0.5;
    shell.scale.set(rise / r, 1, 1);
    shell.position.y = springY;
    shell.receiveShadow = true;
    g.add(shell);

    // Ogives diagonales (croisée d'ogives)
    const corners = [
      [new THREE.Vector3(-len * 0.5, 0, -width * 0.5), new THREE.Vector3(len * 0.5, 0, width * 0.5)],
      [new THREE.Vector3(-len * 0.5, 0, width * 0.5), new THREE.Vector3(len * 0.5, 0, -width * 0.5)],
    ];
    corners.forEach(([a, b]) => {
      addArchSpan(a, b, springY, rise * 0.94, 0.42, 0.36, matStoneTrim, g);
    });

    // Arcs doubleaux (transversaux) et lierne longitudinale
    addArchSpan(
      new THREE.Vector3(-len * 0.5, 0, -width * 0.5),
      new THREE.Vector3(-len * 0.5, 0, width * 0.5),
      springY,
      rise * 0.94,
      0.52,
      0.46,
      matStoneTrim,
      g
    );
    addBox(len, 0.34, 0.34, 0, crownY - 0.1, 0, matStoneTrim, { cast: false, receive: true, parent: g });

    // Clé de voûte pendante emblématique de Saint-Eustache
    if (withPendant) {
      const pendant = new THREE.Mesh(new THREE.ConeGeometry(0.46, 1.55, 8), matStoneTrim);
      pendant.rotation.x = Math.PI;
      pendant.position.y = crownY - 0.85;
      g.add(pendant);
      const boss = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), matGold);
      boss.position.y = crownY - 1.55;
      g.add(boss);
    }

    exteriorGroup.add(g);
  }

  // Vitrail gothique-Renaissance avec meneaux en pierre 3D & encadrement en relief
  function addGothicWindow(w, h, x, y, z, rotY, glassMat, parent = exteriorGroup) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = rotY;

    // Panneau vitré semi-transparent haute résolution
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glassMat);
    pane.castShadow = false;
    pane.receiveShadow = false;
    g.add(pane);

    // 2 meneaux verticaux en pierre 3D (divisant la baie en 3 lancettes réelles)
    const mullionGeo = new THREE.BoxGeometry(0.14, h * 0.78, 0.34);
    [-w / 6, w / 6].forEach((mx) => {
      const m = new THREE.Mesh(mullionGeo, matStoneTrim);
      m.position.set(mx, -h * 0.1, 0);
      m.castShadow = true;
      g.add(m);
    });

    // Traverse de pierre au niveau du tympan + colonnettes d'encadrement
    const transom = new THREE.Mesh(new THREE.BoxGeometry(w, 0.18, 0.36), matStoneTrim);
    transom.position.set(0, h * 0.28, 0);
    g.add(transom);

    // Appui de fenêtre (rejingot en pierre moulurée)
    const sill = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.28, 0.56), matStoneTrim);
    sill.position.set(0, -h * 0.5, 0);
    g.add(sill);

    parent.add(g);
    return g;
  }

  /**
   * ==========================================================================
   * 1. SOL, PARVIS DES HALLES & DALLE INTÉRIEURE MONOLITHIQUE (ZÉRO SCINTILLEMENT)
   * ==========================================================================
   */
  const groundMat = new THREE.MeshStandardMaterial({
    map: texCobble,
    roughness: 0.92,
    metalness: 0.04,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(408, 376), groundMat);
  ground.rotation.x = -Math.PI * 0.5;
  ground.position.y = 0.0;
  ground.receiveShadow = true;
  exteriorGroup.add(ground);

  // Dalle intérieure UNIQUE extrudée d'un seul bloc (plan en croix latine + abside + Chapelle Vierge)
  // Empêche tout z-fighting / scintillement : une seule surface plane continue à y = 0.40m !
  const floorShape = new THREE.Shape();
  floorShape.moveTo(-46.5, -18.8);
  floorShape.lineTo(-2.2, -18.8);
  // Bras Nord du Transept
  floorShape.lineTo(-2.2, -22.5);
  floorShape.lineTo(10.2, -22.5);
  floorShape.lineTo(10.2, -18.8);
  // Chœur Nord jusqu'au début de l'abside (x = 26)
  floorShape.lineTo(26.0, -18.8);
  // Arc Nord de l'abside jusqu'à la Chapelle de la Vierge (z = -5.2)
  const apseR = 19.0;
  const joinAngle = Math.asin(5.2 / apseR);
  floorShape.absarc(26.0, 0, apseR, -Math.PI * 0.5, -joinAngle, false);
  // Chapelle de la Vierge (Est, x = 44..56.8, z = -5.2..+5.2)
  floorShape.lineTo(51.6, -5.2);
  floorShape.absarc(51.6, 0, 5.2, -Math.PI * 0.5, Math.PI * 0.5, false);
  floorShape.lineTo(26.0 + Math.cos(joinAngle) * apseR, 5.2);
  // Arc Sud de l'abside
  floorShape.absarc(26.0, 0, apseR, joinAngle, Math.PI * 0.5, false);
  // Chœur Sud
  floorShape.lineTo(10.2, 18.8);
  // Bras Sud du Transept
  floorShape.lineTo(10.2, 22.5);
  floorShape.lineTo(-2.2, 22.5);
  floorShape.lineTo(-2.2, 18.8);
  // Retour façade Ouest
  floorShape.lineTo(-46.5, 18.8);
  floorShape.closePath();

  const floorGeo = new THREE.ExtrudeGeometry(floorShape, {
    depth: 0.36,
    bevelEnabled: false,
    curveSegments: 24,
  });
  // ExtrudeGeometry place la forme dans XY et extrude en +Z ;
  // rotateX(+PI/2) envoie (x, y, z) -> (x, -z, y) : donc y_shape = +Z monde, et depth s'étend de y = 0.40 à y = 0.04 !
  floorGeo.rotateX(Math.PI * 0.5);
  const floorMesh = new THREE.Mesh(floorGeo, matFloor);
  floorMesh.position.y = 0.40;
  floorMesh.castShadow = false;
  floorMesh.receiveShadow = true;
  exteriorGroup.add(floorMesh);

  // Marches monumentales du parvis Ouest (sans chevauchement coplanaire)
  for (let s = 0; s < 3; s++) {
    addBox(3.4 - s * 0.9, 0.125, 34 - s * 1.4, -50.8 - (2 - s) * 0.45, 0.068 + s * 0.13, 0, matStoneTrim, { cast: true, receive: true });
  }
  // Marches du portail Sud (côté Jardin Nelson-Mandela)
  for (let s = 0; s < 3; s++) {
    addBox(8.5 - s * 0.8, 0.125, 2.8 - s * 0.7, 4, 0.068 + s * 0.13, 23.2 + (2 - s) * 0.35, matStoneTrim, { cast: true, receive: true });
  }

  /**
   * ==========================================================================
   * 2. FAÇADE OCCIDENTALE CLASSIQUE (Jean Hardouin-Mansart de Jouy, XVIIIe s.)
   * Deux ordres superposés (Dorique & Ionique), fronton central,
   * Tour Nord ACHEVÉE (z < 0) et Tour Sud INACHEVÉE (z > 0).
   * ==========================================================================
   */
  const facadeGroup = new THREE.Group();
  facadeGroup.name = 'FacadeOccidentale';
  exteriorGroup.add(facadeGroup);

  // Mur de façade percé de 3 PORTAILS OUVERTS (x = -45.5, épaisseur 2.2m)
  // Segments de murs bas (y = 0.4..7.8) laissant les 3 ouvertures libres :
  // - Portail central : z ∈ [-3.1, +3.1] (largeur 6.2m, hauteur 7.4m)
  // - Portail Nord    : z ∈ [-10.8, -7.7] (largeur 3.1m, hauteur 5.4m)
  // - Portail Sud     : z ∈ [+7.7, +10.8] (largeur 3.1m, hauteur 5.4m)
  addBox(2.2, 13.0, 4.6, -45.5, 6.9, -5.4, matStoneFacade, { collide: true, parent: facadeGroup });
  addBox(2.2, 13.0, 4.6, -45.5, 6.9, +5.4, matStoneFacade, { collide: true, parent: facadeGroup });
  addBox(2.2, 13.0, 8.2, -45.5, 6.9, -14.9, matStoneFacade, { collide: true, parent: facadeGroup });
  addBox(2.2, 13.0, 8.2, -45.5, 6.9, +14.9, matStoneFacade, { collide: true, parent: facadeGroup });

  // Linteaux / tympans au-dessus des 3 portails ouverts (non bloquants au sol)
  addBox(2.2, 5.6, 6.4, -45.5, 10.6, 0, matStoneFacade, { parent: facadeGroup });
  addBox(2.2, 7.6, 3.3, -45.5, 9.6, -9.25, matStoneFacade, { parent: facadeGroup });
  addBox(2.2, 7.6, 3.3, -45.5, 9.6, +9.25, matStoneFacade, { parent: facadeGroup });

  // Vantaux de portes en chêne ouverts en grand contre les piédroits
  [-2.95, 2.95].forEach((pz) => {
    const door = addBox(2.2, 6.8, 0.22, -44.2, 3.8, pz, matWoodDark, { parent: facadeGroup });
    door.rotation.y = pz < 0 ? 0.14 : -0.14;
  });

  // --- PREMIER ORDRE (DORIQUE) : Péristyle / portique avancé (x = -49.5) ---
  const doricZ = [-17.5, -15.6, -11.6, -7.0, -4.3, 4.3, 7.0, 11.6, 15.6, 17.5];
  doricZ.forEach((cz) => {
    // Piédestal dorique
    addBox(1.5, 1.4, 1.5, -49.4, 1.1, cz, matStoneTrim, { parent: facadeGroup });
    // Fût cannelé dorique
    addCylinder(0.52, 0.58, 10.4, 16, -49.4, 7.0, cz, matStoneFacade, { parent: facadeGroup });
    // Chapiteau dorique (échine + abaque)
    addBox(1.45, 0.45, 1.45, -49.4, 12.4, cz, matStoneTrim, { parent: facadeGroup });
    circleColliders.push({ x: -49.4, z: cz, r: 0.8 });
  });

  // Grand entablement dorique avec frise à triglyphes & corniche saillante
  addBox(6.8, 1.85, 38.6, -47.3, 13.55, 0, matStoneTrim, { parent: facadeGroup });
  addBox(7.5, 0.55, 39.4, -47.4, 14.6, 0, matStoneFacade, { parent: facadeGroup });
  for (let tz = -17.5; tz <= 17.5; tz += 2.2) {
    addBox(0.35, 1.1, 0.48, -50.8, 13.55, tz, matStoneFacade, { cast: false, parent: facadeGroup });
  }

  // Plafond du porche dorique
  addBox(4.8, 0.6, 36.8, -47.3, 12.6, 0, matStoneInt, { parent: facadeGroup });

  // --- SECOND ORDRE (IONIQUE) : y = 14.9 .. 25.8 ---
  addBox(3.4, 10.6, 36.6, -45.8, 20.2, 0, matStoneFacade, { parent: facadeGroup });

  // Colonnes ioniques jumelées de la travée centrale & latérales
  const ionicZ = [-16.6, -12.0, -7.2, -4.6, 4.6, 7.2, 12.0, 16.6];
  ionicZ.forEach((cz) => {
    addBox(1.3, 1.2, 1.3, -48.6, 15.5, cz, matStoneTrim, { parent: facadeGroup });
    addCylinder(0.44, 0.49, 8.6, 16, -48.6, 20.4, cz, matStoneFacade, { parent: facadeGroup });
    // Volutes ioniques stylisées
    addBox(1.25, 0.5, 1.45, -48.6, 24.9, cz, matStoneTrim, { parent: facadeGroup });
  });

  // Grande baie centrale cintrée (éclaire la tribune du Grand Orgue)
  addBox(0.5, 7.2, 4.8, -47.55, 20.2, 0, matGlassNave, { cast: false, parent: facadeGroup });
  addBox(0.8, 7.6, 0.55, -47.7, 20.2, -2.55, matStoneTrim, { parent: facadeGroup });
  addBox(0.8, 7.6, 0.55, -47.7, 20.2, +2.55, matStoneTrim, { parent: facadeGroup });

  // Entablement ionique + balustrade supérieure
  addBox(5.6, 1.65, 38.2, -46.8, 25.9, 0, matStoneTrim, { parent: facadeGroup });
  addBox(6.3, 0.5, 39.0, -46.9, 26.85, 0, matStoneFacade, { parent: facadeGroup });

  // Fronton triangulaire classique central (z = -8.2..+8.2)
  const pedimentShape = new THREE.Shape();
  pedimentShape.moveTo(-8.4, 0);
  pedimentShape.lineTo(8.4, 0);
  pedimentShape.lineTo(0, 4.4);
  pedimentShape.closePath();
  const pedimentGeo = new THREE.ExtrudeGeometry(pedimentShape, { depth: 3.4, bevelEnabled: false });
  pedimentGeo.rotateY(Math.PI * 0.5);
  const pediment = new THREE.Mesh(pedimentGeo, matStoneFacade);
  pediment.position.set(-49.6, 27.1, 0);
  pediment.castShadow = true;
  pediment.receiveShadow = true;
  facadeGroup.add(pediment);

  // Croix sommitale du fronton
  addBox(0.28, 2.4, 0.28, -48.0, 32.6, 0, matGold, { parent: facadeGroup });
  addBox(0.24, 0.26, 1.25, -48.0, 33.1, 0, matGold, { parent: facadeGroup });

  // --- TOUR NORD ACHEVÉE (à gauche face à la façade : z = -14.2) ---
  const northTower = new THREE.Group();
  northTower.position.set(-46.5, 27.0, -14.2);
  facadeGroup.add(northTower);

  // Socle carré du beffroi
  addBox(7.2, 2.2, 7.2, 0, 1.1, 0, matStoneTrim, { parent: northTower });
  // Corps du beffroi corinthien (piliers d'angle + baies à abat-sons)
  const ntCorners = [[-2.6, -2.6], [2.6, -2.6], [-2.6, 2.6], [2.6, 2.6]];
  ntCorners.forEach(([cx, cz]) => {
    addBox(1.8, 8.8, 1.8, cx, 6.6, cz, matStoneFacade, { parent: northTower });
    addCylinder(0.32, 0.35, 8.4, 12, cx * 1.18, 6.6, cz * 1.18, matStoneTrim, { parent: northTower });
  });
  // Cœur sombre du beffroi (ouvertures cintrées) + abat-sons
  addBox(4.4, 7.6, 4.4, 0, 6.4, 0, matWoodDark, { parent: northTower });
  // Corniche & balustrade haute de la tour Nord
  addBox(7.8, 1.2, 7.8, 0, 11.4, 0, matStoneTrim, { parent: northTower });
  addBox(6.8, 1.2, 6.8, 0, 12.6, 0, matStoneFacade, { parent: northTower });
  // Tambour octogonal & coupole classique
  addCylinder(2.55, 2.75, 3.2, 8, 0, 14.8, 0, matStoneFacade, { parent: northTower });
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(2.65, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
    matLead
  );
  dome.position.y = 16.2;
  dome.castShadow = true;
  northTower.add(dome);
  // Lanternon & croix culminant à ~47m
  addCylinder(0.7, 0.85, 2.6, 8, 0, 19.6, 0, matStoneTrim, { parent: northTower });
  addBox(0.22, 2.2, 0.22, 0, 21.8, 0, matGold, { parent: northTower });
  addBox(0.2, 0.22, 1.1, 0, 22.2, 0, matGold, { parent: northTower });

  // --- TOUR SUD INACHEVÉE (à droite face à la façade : z = +14.2) ---
  // Détail historique essentiel : interrompue faute de fonds au XVIIIe siècle !
  const southTower = new THREE.Group();
  southTower.position.set(-46.5, 27.0, +14.2);
  facadeGroup.add(southTower);

  // Uniquement le soubassement massif, 4 amorces de piliers inachevés et toit provisoire plat en plomb
  addBox(7.2, 1.8, 7.2, 0, 0.9, 0, matStoneTrim, { parent: southTower });
  ntCorners.forEach(([cx, cz]) => {
    addBox(1.7, 1.4, 1.7, cx, 2.4, cz, matStoneFacade, { parent: southTower });
  });
  addBox(6.4, 0.45, 6.4, 0, 2.0, 0, matLead, { parent: southTower });

  // Murs de liaison latéraux du narthex vers les bas-côtés (fermeture extérieure)
  [-18.8, 18.8].forEach((wz) => {
    addBox(5.5, 14.5, 1.2, -44.2, 7.6, wz, matStoneExt, { collide: true, parent: facadeGroup });
  });

  /**
   * ==========================================================================
   * 3. GRANDE NEF (5 travées : x = -42 .. -2) & CHŒUR (2 travées : x = +10 .. +26)
   * Doubles bas-côtés, piliers fasciculés, triforium, fenêtres hautes & voûtes 33.5m
   * ==========================================================================
   */
  const navePierX = [-42, -34, -26, -18, -10, -2];
  const choirPierX = [10, 18, 26];
  const allBayPiers = [...navePierX, ...choirPierX];

  // Piliers principaux (z = ±6), piliers intermédiaires (z = ±12.5) et pilastres de chapelles (z = ±18.5)
  allBayPiers.forEach((px) => {
    const isCrossing = px === -2 || px === 10;
    const mainR = isCrossing ? 1.05 : 0.82;
    [-6, 6].forEach((pz) => addCompoundPier(px, pz, 22.4, mainR, true));
    [-12.5, 12.5].forEach((pz) => addCompoundPier(px, pz, 14.6, 0.62, true));
    if (!isCrossing) {
      [-18.4, 18.4].forEach((pz) => addCompoundPier(px, pz, 10.6, 0.48, false));
    }
  });

  // Construction travée par travée (Nef & Chœur)
  const buildLongitudinalBay = (xStart, xEnd, isChoir = false) => {
    const cx = (xStart + xEnd) * 0.5;
    const spanX = xEnd - xStart;
    const glassMat = isChoir ? matGlassChoir : matGlassNave;

    // Voûte centrale à 33.5m (croisée d'ogives + clé pendante)
    addRibbedVaultBay(cx, 0, spanX, 12.0, 22.8, 33.5, true);

    // Voûtes des premiers bas-côtés (18.5m) & chapelles latérales (12.5m)
    [-9.25, 9.25].forEach((iz) => {
      addRibbedVaultBay(cx, iz, spanX, 6.5, 14.4, 18.5, false);
    });
    [-15.5, 15.5].forEach((oz) => {
      addRibbedVaultBay(cx, oz, spanX, 6.0, 10.2, 12.5, false);
    });

    // Élévation Nord (-Z) et Sud (+Z) de la travée
    [-1, 1].forEach((side) => {
      const zMain = side * 6.0;
      const zInner = side * 12.5;
      const zOuter = side * 18.8;

      // Grandes arcades (entre piliers principaux)
      addArchSpan(
        new THREE.Vector3(xStart, 0, zMain),
        new THREE.Vector3(xEnd, 0, zMain),
        13.2,
        4.2,
        0.95,
        0.95,
        matStoneInt
      );
      // Écoinçons au-dessus de l'arcade
      addBox(spanX, 1.35, 0.9, cx, 17.5, zMain, matStoneInt);

      // Triforium Renaissance (galerie à colonnettes & balustrade : y = 18.2..22.4)
      addBox(spanX, 0.45, 1.05, cx, 18.3, zMain, matStoneTrim);
      addBox(spanX, 0.55, 1.05, cx, 22.2, zMain, matStoneTrim);
      for (let k = -1; k <= 1; k++) {
        addCylinder(0.18, 0.2, 3.6, 8, cx + k * 2.1, 20.2, zMain, matStoneTrim);
      }
      // Fond sombre du triforium
      addBox(spanX - 0.6, 3.6, 0.25, cx, 20.2, zMain + side * 0.55, matStoneExt);

      // Fenêtres hautes (Clerestory : y = 22.5..32.2) avec vitraux réalistes & meneaux 3D
      addGothicWindow(spanX - 2.4, 8.6, cx, 27.3, zMain, 0, glassMat);
      // Piédroits & linteau encadrant le vitrail haut
      addBox(1.3, 10.0, 1.05, xStart + 0.65, 27.5, zMain, matStoneExt);
      addBox(1.3, 10.0, 1.05, xEnd - 0.65, 27.5, zMain, matStoneExt);
      addBox(spanX, 1.6, 1.15, cx, 32.6, zMain, matStoneExt);

      // Arcades entre 1er et 2e bas-côté
      addArchSpan(
        new THREE.Vector3(xStart, 0, zInner),
        new THREE.Vector3(xEnd, 0, zInner),
        10.8,
        3.4,
        0.7,
        0.72,
        matStoneInt
      );

      // Mur extérieur des chapelles latérales (z = ±18.8) avec grandes baies vitrées
      addBox(spanX, 3.2, 1.1, cx, 2.0, zOuter, matStoneExt, { collide: true });
      addBox(1.5, 9.6, 1.15, xStart + 0.75, 8.2, zOuter, matStoneExt);
      addBox(1.5, 9.6, 1.15, xEnd - 0.75, 8.2, zOuter, matStoneExt);
      addBox(spanX, 1.6, 1.2, cx, 13.0, zOuter, matStoneExt);
      // Vitrail de chapelle latérale (sauf dans la chapelle de Keith Haring pour le mur d'autel)
      const isHaringChapel = !isChoir && side === -1 && Math.abs(cx - (-14)) < 1;
      if (isHaringChapel) {
        addBox(spanX - 2.6, 9.2, 0.8, cx, 8.0, zOuter, matStoneInt);
      } else {
        addGothicWindow(spanX - 2.8, 8.6, cx, 7.9, zOuter, 0, glassMat);
      }

      // Cloisons basses entre chapelles latérales (laissant le passage dans le bas-côté)
      addBox(0.55, 11.2, 4.4, xStart, 6.0, side * 16.3, matStoneInt, { collide: true });
    });
  };

  for (let i = 0; i < navePierX.length - 1; i++) {
    buildLongitudinalBay(navePierX[i], navePierX[i + 1], false);
  }
  for (let i = 0; i < choirPierX.length - 1; i++) {
    buildLongitudinalBay(choirPierX[i], choirPierX[i + 1], true);
  }

  /**
   * ==========================================================================
   * 4. DOUBLES ARCS-BOUTANTS, CONTREFORTS & PINACLES (Flancs gothiques)
   * ==========================================================================
   */
  function addFlyingButtressPair(px, side) {
    const g = new THREE.Group();
    const s = side; // -1 Nord, +1 Sud

    // Contrefort extérieur massif (z = s * 20.3)
    addBox(1.85, 22.0, 2.6, px, 11.0, s * 20.3, matStoneExt, { collide: true, parent: g });
    // Pinacle gothique-Renaissance sur le contrefort extérieur
    addBox(1.5, 4.2, 1.5, px, 24.1, s * 20.3, matStoneTrim, { parent: g });
    const spireOuter = new THREE.Mesh(new THREE.ConeGeometry(0.95, 4.4, 4), matStoneTrim);
    spireOuter.position.set(px, 28.4, s * 20.3);
    spireOuter.rotation.y = Math.PI * 0.25;
    spireOuter.castShadow = true;
    g.add(spireOuter);

    // Contrefort intermédiaire (z = s * 13.0) au-dessus du 1er bas-côté
    addBox(1.55, 14.5, 1.9, px, 21.5, s * 13.0, matStoneExt, { parent: g });
    const spireMid = new THREE.Mesh(new THREE.ConeGeometry(0.82, 4.2, 4), matStoneTrim);
    spireMid.position.set(px, 30.8, s * 13.0);
    spireMid.rotation.y = Math.PI * 0.25;
    spireMid.castShadow = true;
    g.add(spireMid);

    // Double volée d'arcs-boutants (2 étages superposés par travée)
    const addFlyerBeam = (zFrom, yFrom, zTo, yTo) => {
      const dz = zTo - zFrom;
      const dy = yTo - yFrom;
      const len = Math.hypot(dz, dy);
      const angle = Math.atan2(dy, dz);
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.78, 1.05, len), matStoneTrim);
      beam.position.set(px, (yFrom + yTo) * 0.5, (zFrom + zTo) * 0.5);
      beam.rotation.x = -angle;
      beam.castShadow = true;
      beam.receiveShadow = true;
      g.add(beam);
    };

    // Volée inférieure & supérieure (extérieur -> intermédiaire -> mur haut)
    addFlyerBeam(s * 19.6, 17.5, s * 13.4, 21.2);
    addFlyerBeam(s * 19.6, 21.4, s * 13.4, 25.0);
    addFlyerBeam(s * 12.6, 22.8, s * 6.4, 26.8);
    addFlyerBeam(s * 12.6, 26.8, s * 6.4, 30.8);

    exteriorGroup.add(g);
  }

  [-34, -26, -18, -10, 18, 26].forEach((px) => {
    addFlyingButtressPair(px, -1);
    addFlyingButtressPair(px, 1);
  });

  /**
   * ==========================================================================
   * 5. TRANSEPT (Croisée + Bras Nord & Sud, Rosaces, Portail Sud & Méridien)
   * ==========================================================================
   */
  // Voûte de la croisée du transept (x = -2..+10, z = -6..+6)
  addRibbedVaultBay(4, 0, 12, 12, 22.8, 33.8, true);

  // Bras Nord (z = -6..-22) et Bras Sud (z = +6..+22)
  [-1, 1].forEach((side) => {
    const zMid = side * 14.0;
    const zEnd = side * 22.2;

    // Voûtes des bras du transept (axe Nord-Sud 'z')
    addRibbedVaultBay(4, side * 10.5, 12, 9.0, 22.8, 33.4, true, 'z');
    addRibbedVaultBay(4, side * 18.2, 12, 7.6, 22.8, 33.4, false, 'z');

    // Murs latéraux hauts des bras du transept (x = -2 et x = +10) sans aucune fente
    [-2, 10].forEach((tx) => {
      addBox(1.15, 16.2, 16.6, tx, 25.6, zMid, matStoneExt);
      // Fermeture au-dessus des chapelles latérales (y = 12.2..18.5, z = ±12.5..±19.2)
      addBox(1.15, 6.8, 7.2, tx, 15.5, side * 15.8, matStoneExt);
      // Bas-côtés ouverts dans la partie basse jusqu'à z=±18.5, mur fermé au-delà
      addBox(1.2, 18.2, 4.2, tx, 9.5, side * 20.3, matStoneExt, { collide: true });
    });

    // Mur pignon du transept (z = ±22.2)
    // Côté Sud (side === 1) : PORTAIL SUD OUVERT sur le Jardin Nelson-Mandela (x ∈ [1.8, 6.2], h = 6.6m)
    if (side === 1) {
      addBox(4.2, 18.6, 1.5, -0.1, 9.5, zEnd, matStoneExt, { collide: true });
      addBox(4.2, 18.6, 1.5, +8.1, 9.5, zEnd, matStoneExt, { collide: true });
      addBox(4.8, 12.2, 1.5, 4.0, 12.9, zEnd, matStoneExt);
      // Vantaux ouverts du portail Sud
      [1.95, 6.05].forEach((dx) => {
        addBox(0.22, 6.0, 1.8, dx, 3.4, zEnd - 1.1, matWoodDark);
      });
    } else {
      // Bras Nord : mur plein avec portail fermé ornementé
      addBox(12.6, 18.6, 1.5, 4.0, 9.5, zEnd, matStoneExt, { collide: true });
      addBox(4.2, 6.4, 0.35, 4.0, 3.6, zEnd - 0.85, matWoodDark);
    }

    // Mur pignon percé d'une ouverture circulaire EXACTE autour de la Grande Rosace (zéro écoinçon ouvert !)
    const roseWallShape = new THREE.Shape();
    roseWallShape.moveTo(-6.3, -6.2);
    roseWallShape.lineTo(6.3, -6.2);
    roseWallShape.lineTo(6.3, 8.8);
    roseWallShape.lineTo(-6.3, 8.8);
    roseWallShape.closePath();
    const roseHole = new THREE.Path();
    roseHole.absarc(0, 0, 4.08, 0, Math.PI * 2, true);
    roseWallShape.holes.push(roseHole);
    const roseWallGeo = new THREE.ExtrudeGeometry(roseWallShape, { depth: 1.5, bevelEnabled: false, curveSegments: 32 });
    const roseWallMesh = new THREE.Mesh(roseWallGeo, matStoneExt);
    roseWallMesh.position.set(4.0, 24.6, zEnd - 0.75);
    roseWallMesh.castShadow = true;
    roseWallMesh.receiveShadow = true;
    exteriorGroup.add(roseWallMesh);

    // GRANDE ROSACE (diamètre 8.2m, centrée à x=4, y=24.6, z=±22.2) avec remplage 3D sculpté
    const roseGroup = new THREE.Group();
    roseGroup.position.set(4.0, 24.6, zEnd);
    exteriorGroup.add(roseGroup);

    const roseDisc = new THREE.Mesh(new THREE.CircleGeometry(4.1, 40), matGlassRose);
    if (side < 0) roseDisc.rotation.y = Math.PI;
    roseGroup.add(roseDisc);

    // Cadres & anneaux concentriques de remplage en pierre 3D (visibles de l'intérieur ET de l'extérieur)
    [4.25, 2.75, 0.92].forEach((rad, rIdx) => {
      const tube = rIdx === 0 ? 0.42 : rIdx === 1 ? 0.15 : 0.13;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(rad, tube, 10, 36), matStoneTrim);
      ring.position.z = side * (rIdx === 0 ? 0.25 : 0.02);
      roseGroup.add(ring);
    });
    // 12 colonnettes rayonnantes en pierre 3D de la rosace flamboyante
    const spokeGeo = new THREE.CylinderGeometry(0.07, 0.09, 3.25, 6);
    for (let sp = 0; sp < 12; sp++) {
      const a = (sp / 12) * Math.PI * 2;
      const spoke = new THREE.Mesh(spokeGeo, matStoneTrim);
      spoke.position.set(Math.cos(a) * 2.52, Math.sin(a) * 2.52, 0);
      spoke.rotation.z = a - Math.PI * 0.5;
      roseGroup.add(spoke);
    }

    // Tourelles d'angle du transept avec pinacles
    [-2.4, 10.4].forEach((tx) => {
      addBox(2.1, 35.0, 2.2, tx, 17.5, zEnd + side * 0.6, matStoneExt, { collide: true });
      const pin = new THREE.Mesh(new THREE.ConeGeometry(1.15, 6.2, 6), matStoneTrim);
      pin.position.set(tx, 38.1, zEnd + side * 0.6);
      pin.castShadow = true;
      exteriorGroup.add(pin);
    });

    // Pignon triangulaire sommital du transept
    const gableShape = new THREE.Shape();
    gableShape.moveTo(-6.6, 0);
    gableShape.lineTo(6.6, 0);
    gableShape.lineTo(0, 10.2);
    gableShape.closePath();
    const gableGeo = new THREE.ExtrudeGeometry(gableShape, { depth: 1.4, bevelEnabled: false });
    const gable = new THREE.Mesh(gableGeo, matStoneExt);
    gable.position.set(4.0, 33.2, zEnd - 0.7);
    gable.castShadow = true;
    gable.receiveShadow = true;
    exteriorGroup.add(gable);
  });

  // --- MÉRIDIEN AU SOL & CADRAN SOLAIRE DU TRANSEPT SUD (POI 7) ---
  // Ligne méridienne en laiton doré incrustée dans le marbre du transept Sud
  addBox(0.14, 0.04, 16.5, 4.0, 0.43, 13.0, matGold, { cast: false, receive: true });
  for (let mz = 6; mz <= 20; mz += 2.0) {
    addBox(0.65, 0.045, 0.09, 4.0, 0.435, mz, matGold, { cast: false, receive: true });
  }
  // Plaque astronomique du solstice au centre du transept Sud
  const meridianDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.05, 24), matGold);
  meridianDisc.position.set(4.0, 0.435, 14.0);
  exteriorGroup.add(meridianDisc);

  // Cadran solaire mural sur la façade extérieure ET cartouche solaire intérieur du transept Sud
  const matSundial = new THREE.MeshStandardMaterial({ map: texSundial, roughness: 0.42, metalness: 0.35 });
  const extSundial = addBox(3.4, 3.4, 0.25, 4.0, 15.6, 23.1, matSundial, { cast: true });
  // Style (gnomon) en bronze du cadran solaire
  const gnomon = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 2.2, 8), matGold);
  gnomon.position.set(4.0, 16.0, 24.0);
  gnomon.rotation.x = Math.PI * 0.36;
  gnomon.castShadow = true;
  exteriorGroup.add(gnomon);
  void extSundial;

  // Plaque méridienne intérieure visible sous la rosace Sud
  addBox(3.0, 2.4, 0.2, 4.0, 14.8, 21.3, matSundial, { cast: false });

  /**
   * ==========================================================================
   * 6. CHEVET ARRONDI, DÉAMBULATOIRE, CHAPELLES RAYONNANTES & CHAPELLE DE LA VIERGE
   * Centré en (x = 26, z = 0)
   * ==========================================================================
   */
  const apseCenterX = 26;
  const apseSegments = 5;

  // Piliers de l'abside (r = 6.0), du déambulatoire (r = 12.5) et murs extérieurs (r = 18.8)
  for (let i = 0; i <= apseSegments; i++) {
    const theta = -Math.PI * 0.5 + (i / apseSegments) * Math.PI;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);

    if (i > 0 && i < apseSegments) {
      addCompoundPier(apseCenterX + cosT * 6.0, sinT * 6.0, 22.4, 0.68, true);
      addCompoundPier(apseCenterX + cosT * 12.5, sinT * 12.5, 14.5, 0.58, true);
    }

    // Segments entre deux rayons de l'abside
    if (i < apseSegments) {
      const thetaMid = -Math.PI * 0.5 + ((i + 0.5) / apseSegments) * Math.PI;
      const cM = Math.cos(thetaMid);
      const sM = Math.sin(thetaMid);

      // Vitraux hauts du chœur (Philippe de Champaigne) sur l'hémicycle (r = 6.0) avec meneaux 3D
      addGothicWindow(3.3, 9.2, apseCenterX + cM * 6.0, 27.2, sM * 6.0, Math.atan2(cM, sM), matGlassChoir);

      // Mur haut entre les vitraux du chevet
      const upperPier = new THREE.Mesh(new THREE.BoxGeometry(0.95, 16.0, 0.95), matStoneExt);
      upperPier.position.set(apseCenterX + cosT * 6.0, 25.5, sinT * 6.0);
      upperPier.castShadow = true;
      exteriorGroup.add(upperPier);

      // Arcs-boutants rayonnants du chevet
      if (i > 0) {
        const bOuterX = apseCenterX + cosT * 19.6;
        const bOuterZ = sinT * 19.6;
        addBox(1.5, 20.5, 1.5, bOuterX, 10.2, bOuterZ, matStoneExt);
        const pin = new THREE.Mesh(new THREE.ConeGeometry(0.78, 3.8, 4), matStoneTrim);
        pin.position.set(bOuterX, 22.3, bOuterZ);
        pin.castShadow = true;
        exteriorGroup.add(pin);

        // Volée rayonnante vers le mur haut du chevet
        const flyer = new THREE.Mesh(new THREE.BoxGeometry(13.2, 0.9, 0.68), matStoneTrim);
        flyer.position.set(apseCenterX + cosT * 12.8, 23.6, sinT * 12.8);
        flyer.rotation.y = -theta;
        flyer.rotation.z = -0.34;
        flyer.castShadow = true;
        exteriorGroup.add(flyer);
      }

      // Murs des chapelles rayonnantes (r = 18.8) — ouverture centrale à i === 2 vers la Chapelle de la Vierge !
      if (i !== 2) {
        const segW = 11.4;
        const wx = apseCenterX + cM * 18.8;
        const wz = sM * 18.8;
        const wallGroup = new THREE.Group();
        wallGroup.position.set(wx, 0, wz);
        wallGroup.rotation.y = Math.atan2(cM, sM);

        addBox(segW, 3.4, 1.1, 0, 2.1, 0, matStoneExt, { parent: wallGroup });
        addBox(2.2, 9.6, 1.15, -segW * 0.4, 8.2, 0, matStoneExt, { parent: wallGroup });
        addBox(2.2, 9.6, 1.15, +segW * 0.4, 8.2, 0, matStoneExt, { parent: wallGroup });
        addBox(segW, 1.8, 1.15, 0, 13.0, 0, matStoneExt, { parent: wallGroup });
        addGothicWindow(segW - 4.4, 8.2, 0, 7.9, 0, 0, matGlassChoir, wallGroup);
        exteriorGroup.add(wallGroup);

        // Collider discret approximant le mur courbe de la chapelle rayonnante
        circleColliders.push({ x: wx, z: wz, r: 3.4 });
      }
    }
  }

  // Mur de triforium & bande supérieure fermant l'hémicycle du chevet (zéro fuite de ciel sous/sur les vitraux !)
  const apseTriforium = new THREE.Mesh(
    new THREE.CylinderGeometry(6.15, 6.15, 9.2, 24, 1, true, 0, Math.PI),
    matStoneIntDouble
  );
  apseTriforium.position.set(apseCenterX, 18.2, 0);
  exteriorGroup.add(apseTriforium);

  const apseUpperBand = new THREE.Mesh(
    new THREE.CylinderGeometry(6.15, 6.15, 3.4, 24, 1, true, 0, Math.PI),
    matStoneIntDouble
  );
  apseUpperBand.position.set(apseCenterX, 32.8, 0);
  exteriorGroup.add(apseUpperBand);

  // Coupole / voûte en cul-de-four nervurée du chevet (r = 6.2) et voûte du déambulatoire
  const apseVault = new THREE.Mesh(
    new THREE.SphereGeometry(6.3, 18, 10, Math.PI * 0.5, Math.PI, 0, Math.PI * 0.5),
    matStoneIntDouble
  );
  apseVault.scale.set(1, 1.65, 1);
  apseVault.position.set(apseCenterX, 22.8, 0);
  exteriorGroup.add(apseVault);

  // Couverture intérieure du déambulatoire et des chapelles rayonnantes
  const ambCeiling = new THREE.Mesh(
    new THREE.RingGeometry(6.1, 19.0, 24, 1, -Math.PI * 0.5, Math.PI),
    matStoneIntDouble
  );
  ambCeiling.rotation.x = Math.PI * 0.5;
  ambCeiling.position.set(apseCenterX, 13.8, 0);
  exteriorGroup.add(ambCeiling);

  // --- CHAPELLE DE LA VIERGE (Chapelle axiale à l'Est : x = 42 .. 56.8, z = -5.2 .. +5.2) ---
  // Architecture néoclassique (consacrée par Pie VII en 1804), fresques mariales de Thomas Couture,
  // retable corinthien à gloire dorée et Vierge à l'Enfant sculptée par Jean-Baptiste Pigalle (1748).
  const ladyGroup = new THREE.Group();
  ladyGroup.name = 'ChapelleVierge';
  exteriorGroup.add(ladyGroup);

  const matLapisNiche = new THREE.MeshStandardMaterial({
    color: 0x16294a,
    roughness: 0.42,
    metalness: 0.12,
  });
  const matMarbleVeined = new THREE.MeshStandardMaterial({
    color: 0xe6dccb,
    roughness: 0.28,
    metalness: 0.08,
  });
  const matCrimsonVelvet = new THREE.MeshStandardMaterial({
    color: 0x731824,
    roughness: 0.85,
    metalness: 0.04,
  });

  // Texture procédurale des fresques mariales de Thomas Couture (murs latéraux de la Chapelle de la Vierge)
  function createCoutureFrescoTexture(isNorth) {
    const fw = 512;
    const fh = 384;
    const c = document.createElement('canvas');
    c.width = fw;
    c.height = fh;
    const ctx = c.getContext('2d');
    const bg = ctx.createLinearGradient(0, 0, 0, fh);
    bg.addColorStop(0, '#c8a86a');
    bg.addColorStop(0.35, isNorth ? '#4d6f96' : '#6b5e82');
    bg.addColorStop(0.75, '#594234');
    bg.addColorStop(1, '#2d221c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, fw, fh);

    // Gloire dorée supérieure
    const gl = ctx.createRadialGradient(fw * 0.5, fh * 0.32, 8, fw * 0.5, fh * 0.32, 130);
    gl.addColorStop(0, 'rgba(255, 240, 185, 0.92)');
    gl.addColorStop(0.55, 'rgba(225, 175, 85, 0.38)');
    gl.addColorStop(1, 'rgba(225, 175, 85, 0)');
    ctx.fillStyle = gl;
    ctx.fillRect(0, 0, fw, fh);

    // Nuées peintes & figure mariale stylisée
    ctx.fillStyle = 'rgba(242, 232, 212, 0.52)';
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.arc(80 + i * 58, fh * 0.66 + Math.sin(i * 1.4) * 16, 46, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#24457a';
    ctx.beginPath();
    ctx.moveTo(fw * 0.5, fh * 0.24);
    ctx.lineTo(fw * 0.5 + 34, fh * 0.68);
    ctx.lineTo(fw * 0.5 - 34, fh * 0.68);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f2dec2';
    ctx.beginPath();
    ctx.arc(fw * 0.5, fh * 0.23, 14, 0, Math.PI * 2);
    ctx.fill();

    // Encadrement peint en trompe-l'œil
    ctx.strokeStyle = '#c89b44';
    ctx.lineWidth = 10;
    ctx.strokeRect(8, 8, fw - 16, fh - 16);

    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  // Murs Nord & Sud de la Chapelle de la Vierge + pilastres corinthiens + grandes verrières hautes + fresques Couture
  [-5.2, 5.2].forEach((lz) => {
    const sign = Math.sign(lz);
    addBox(9.6, 4.4, 0.9, 46.8, 2.6, lz, matStoneExt, { collide: true, parent: ladyGroup });
    addBox(9.6, 2.0, 0.95, 46.8, 12.2, lz, matStoneExt, { parent: ladyGroup });
    addBox(2.0, 6.8, 0.95, 43.0, 8.0, lz, matStoneExt, { parent: ladyGroup });
    addBox(2.0, 6.8, 0.95, 50.6, 8.0, lz, matStoneExt, { parent: ladyGroup });
    addGothicWindow(5.6, 6.4, 46.8, 8.0, lz, 0, matGlassChoir, ladyGroup);

    // Pilastres corinthiens intérieurs à chapiteaux dorés
    [43.2, 46.8, 50.4].forEach((px) => {
      addBox(0.52, 9.8, 0.34, px, 5.5, lz - sign * 0.52, matStoneInt, { parent: ladyGroup });
      addBox(0.72, 0.45, 0.48, px, 10.5, lz - sign * 0.52, matGold, { parent: ladyGroup });
      addBox(0.68, 0.55, 0.48, px, 0.72, lz - sign * 0.52, matStoneTrim, { parent: ladyGroup });
    });

    // Corniche continue dorée & entablement
    addBox(9.6, 0.48, 0.6, 46.8, 10.95, lz - sign * 0.46, matStoneTrim, { parent: ladyGroup });
    addBox(9.6, 0.14, 0.65, 46.8, 10.68, lz - sign * 0.46, matGold, { parent: ladyGroup });

    // Grande fresque mariale de Thomas Couture encadrée d'or sur le mur bas
    const frescoMat = new THREE.MeshStandardMaterial({
      map: createCoutureFrescoTexture(sign < 0),
      roughness: 0.62,
      metalness: 0.05,
    });
    addBox(4.8, 2.9, 0.16, 46.8, 2.75, lz - sign * 0.52, matGold, { parent: ladyGroup });
    addBox(4.5, 2.6, 0.18, 46.8, 2.75, lz - sign * 0.54, frescoMat, { parent: ladyGroup });
  });

  // Abside semi-circulaire de la Chapelle de la Vierge (x = 51.6, r = 5.2)
  const ladyApseWall = new THREE.Mesh(
    new THREE.CylinderGeometry(5.2, 5.2, 11.4, 24, 1, true, 0, Math.PI),
    matStoneInt.clone()
  );
  ladyApseWall.material.side = THREE.DoubleSide;
  ladyApseWall.position.set(51.6, 6.1, 0);
  ladyApseWall.castShadow = true;
  ladyApseWall.receiveShadow = true;
  ladyGroup.add(ladyApseWall);
  circleColliders.push({ x: 54.4, z: 0, r: 2.3 });

  // 7 pilastres corinthiens cannelés répartis autour de l'hémicycle + entablement circulaire
  for (let p = 0; p <= 6; p++) {
    const a = -Math.PI * 0.46 + (p / 6) * Math.PI * 0.92;
    const px = 51.6 + Math.cos(a) * 4.92;
    const pz = Math.sin(a) * 4.92;
    const pil = new THREE.Mesh(new THREE.BoxGeometry(0.42, 10.0, 0.48), matStoneTrim);
    pil.position.set(px, 5.4, pz);
    pil.rotation.y = -a;
    ladyGroup.add(pil);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.42, 0.62), matGold);
    cap.position.set(px, 10.5, pz);
    cap.rotation.y = -a;
    ladyGroup.add(cap);
  }
  const apseCornice = new THREE.Mesh(
    new THREE.TorusGeometry(4.95, 0.24, 8, 28, Math.PI),
    matStoneTrim
  );
  apseCornice.rotation.x = Math.PI * 0.5;
  apseCornice.rotation.z = -Math.PI * 0.5;
  apseCornice.position.set(51.6, 10.95, 0);
  ladyGroup.add(apseCornice);

  // Cul-de-four (demi-coupole nervurée à côtes dorées) coiffant l'abside de la Vierge
  const ladyDome = new THREE.Mesh(
    new THREE.SphereGeometry(5.2, 24, 14, Math.PI * 0.5, Math.PI, 0, Math.PI * 0.5),
    matStoneInt.clone()
  );
  ladyDome.material.side = THREE.DoubleSide;
  ladyDome.position.set(51.6, 11.1, 0);
  ladyDome.scale.set(1, 0.72, 1);
  ladyGroup.add(ladyDome);

  // Voûte en berceau à caissons sur la travée rectangulaire de la chapelle
  addRibbedVaultBay(46.8, 0, 9.6, 10.4, 10.8, 14.5, true, 'x');

  // Toiture extérieure propre en ardoise sur la Chapelle de la Vierge
  const ladyRoof = new THREE.Mesh(new THREE.ConeGeometry(5.8, 4.8, 20, 1, false, 0, Math.PI), matSlate);
  ladyRoof.position.set(51.6, 17.2, 0);
  ladyRoof.castShadow = true;
  ladyGroup.add(ladyRoof);
  const ladyGableShape = new THREE.Shape();
  ladyGableShape.moveTo(-5.8, 0);
  ladyGableShape.lineTo(5.8, 0);
  ladyGableShape.lineTo(0, 4.8);
  ladyGableShape.closePath();
  const ladyGableGeo = new THREE.ExtrudeGeometry(ladyGableShape, { depth: 9.8, bevelEnabled: false });
  ladyGableGeo.translate(0, 0, -4.9);
  const ladyGableMesh = new THREE.Mesh(ladyGableGeo, matSlate);
  ladyGableMesh.position.set(46.8, 14.8, 0);
  ladyGableMesh.rotation.y = Math.PI * 0.5;
  ladyGableMesh.castShadow = true;
  ladyGroup.add(ladyGableMesh);

  // Balustrade de communion en marbre à l'entrée de la Chapelle de la Vierge (ouverture centrale libre !)
  [-3.2, 3.2].forEach((bz) => {
    addBox(0.32, 0.92, 3.4, 44.2, 0.86, bz, matMarbleVeined, { collide: true, parent: ladyGroup });
    addBox(0.42, 0.12, 3.5, 44.2, 1.36, bz, matMarbleWhite, { parent: ladyGroup });
    for (let k = -1.2; k <= 1.2; k += 0.48) {
      addCylinder(0.06, 0.08, 0.76, 8, 44.2, 0.86, bz + k, matMarbleWhite, { parent: ladyGroup });
    }
  });

  // Marches de marbre & tapis liturgique cramoisi bordé d'or montant vers l'autel de la Vierge
  addBox(3.4, 0.16, 6.4, 50.0, 0.49, 0, matMarbleVeined, { cast: false, receive: true, parent: ladyGroup });
  addBox(2.5, 0.16, 5.4, 50.45, 0.65, 0, matMarbleWhite, { cast: false, receive: true, parent: ladyGroup });
  addBox(6.8, 0.025, 2.6, 47.4, 0.418, 0, matCrimsonVelvet, { cast: false, receive: true, parent: ladyGroup });
  addBox(6.8, 0.028, 0.09, 47.4, 0.42, -1.22, matGold, { cast: false, parent: ladyGroup });
  addBox(6.8, 0.028, 0.09, 47.4, 0.42, 1.22, matGold, { cast: false, parent: ladyGroup });

  // Autel monumental de la Vierge (marbre blanc veiné, antependium doré & 6 chandeliers baroques)
  addBox(1.55, 1.15, 3.8, 50.5, 1.30, 0, matMarbleWhite, { collide: true, parent: ladyGroup });
  addBox(1.72, 0.14, 4.05, 50.5, 1.94, 0, matMarbleVeined, { parent: ladyGroup });
  addBox(0.14, 0.82, 2.8, 49.7, 1.30, 0, matLapisNiche, { parent: ladyGroup });
  addBox(0.16, 0.68, 2.5, 49.68, 1.30, 0, matGold, { parent: ladyGroup });
  // Gradin d'autel & tabernacle doré
  addBox(0.65, 0.36, 3.5, 50.95, 2.18, 0, matMarbleWhite, { parent: ladyGroup });
  addBox(0.68, 0.68, 0.72, 50.95, 2.68, 0, matGold, { parent: ladyGroup });
  // 6 chandeliers baroques dorés avec cierges lumineux
  [-1.55, -1.18, -0.82, 0.82, 1.18, 1.55].forEach((cz) => {
    addCylinder(0.04, 0.11, 0.62, 10, 50.92, 2.66, cz, matGold, { parent: ladyGroup });
    addCylinder(0.028, 0.03, 0.36, 8, 50.92, 3.12, cz, matMarbleWhite, { parent: ladyGroup });
  });

  // Grand Retable Monumental de la Chapelle de la Vierge (4 colonnes corinthiennes jumelées + fronton + gloire dorée)
  const matLapisNicheDouble = matLapisNiche.clone();
  matLapisNicheDouble.side = THREE.DoubleSide;
  const matMarbleWhiteDouble = matMarbleWhite.clone();
  matMarbleWhiteDouble.side = THREE.DoubleSide;

  const retable = new THREE.Group();
  retable.position.set(51.9, 0.72, 0);
  interiorDetailGroup.add(retable);

  // Fond de retable en marbre gris-beige découpé autour de la niche creuse bleu nuit (zéro bouchage !)
  addBox(0.85, 7.8, 1.55, 0.45, 4.1, -2.32, matMarbleVeined, { parent: retable });
  addBox(0.85, 7.8, 1.55, 0.45, 4.1, +2.32, matMarbleVeined, { parent: retable });
  addBox(0.85, 1.7, 3.2, 0.45, 1.05, 0, matMarbleVeined, { parent: retable });
  addBox(0.85, 1.25, 3.2, 0.45, 7.45, 0, matMarbleVeined, { parent: retable });

  // Grande niche creuse bleu nuit lapis-lazuli mettant magnifiquement en valeur le marbre blanc de Pigalle !
  const nicheBack = new THREE.Mesh(
    new THREE.CylinderGeometry(1.55, 1.55, 5.2, 24, 1, true, 0, Math.PI),
    matLapisNicheDouble
  );
  nicheBack.position.set(0.05, 4.3, 0);
  retable.add(nicheBack);
  // Calotte supérieure en cul-de-four bleu nuit bordée d'un arc doré
  const nicheDome = new THREE.Mesh(
    new THREE.SphereGeometry(1.55, 24, 12, Math.PI * 0.5, Math.PI, 0, Math.PI * 0.5),
    matLapisNicheDouble
  );
  nicheDome.position.set(0.05, 6.9, 0);
  retable.add(nicheDome);
  const nicheArchTrim = new THREE.Mesh(new THREE.TorusGeometry(1.56, 0.08, 8, 24, Math.PI), matGold);
  nicheArchTrim.rotation.y = Math.PI * 0.5;
  nicheArchTrim.position.set(0.04, 6.9, 0);
  retable.add(nicheArchTrim);

  // 4 Colonnes corinthiennes jumelées en marbre veiné à bases & chapiteaux dorés
  [-2.55, -1.92, 1.92, 2.55].forEach((cz) => {
    addBox(0.75, 1.35, 0.75, -0.15, 0.85, cz, matMarbleVeined, { parent: retable });
    addCylinder(0.21, 0.24, 5.4, 16, -0.15, 4.2, cz, matMarbleWhite, { parent: retable });
    addCylinder(0.29, 0.21, 0.48, 12, -0.15, 7.1, cz, matGold, { parent: retable });
  });

  // Entablement sculpté & Fronton cintré monumental surmonté d'une croix & gloire solaire
  addBox(1.35, 0.55, 6.6, 0.0, 7.62, 0, matMarbleWhite, { parent: retable });
  addBox(1.42, 0.16, 6.75, 0.0, 7.96, 0, matGold, { parent: retable });
  const archPediment = new THREE.Mesh(new THREE.TorusGeometry(2.75, 0.26, 10, 24, Math.PI), matMarbleWhite);
  archPediment.rotation.y = Math.PI * 0.5;
  archPediment.scale.set(1, 0.58, 1);
  archPediment.position.set(-0.08, 7.95, 0);
  retable.add(archPediment);

  // Gloire rayonnante en bronze doré (16 rayons solaires + cœur doré autour de la Vierge de Pigalle)
  const gloryGroup = new THREE.Group();
  gloryGroup.position.set(0.08, 5.15, 0);
  retable.add(gloryGroup);
  const gloryCore = new THREE.Mesh(
    new THREE.CircleGeometry(0.46, 20),
    new THREE.MeshStandardMaterial({
      color: 0xf7d77e,
      emissive: new THREE.Color(0xd99b2e),
      emissiveIntensity: 0.75,
      roughness: 0.28,
      metalness: 0.65,
      side: THREE.DoubleSide,
    })
  );
  gloryCore.rotation.y = -Math.PI * 0.5;
  gloryGroup.add(gloryCore);
  for (let r = 0; r < 16; r++) {
    const a = (r / 16) * Math.PI * 2;
    const rLen = r % 2 === 0 ? 1.55 : 1.08;
    const ray = new THREE.Mesh(new THREE.ConeGeometry(0.055, rLen, 4), matGold);
    ray.position.set(0, Math.cos(a) * (0.42 + rLen * 0.45), Math.sin(a) * (0.42 + rLen * 0.45));
    ray.rotation.x = a;
    gloryGroup.add(ray);
  }

  // --- SCULPTURE DE LA VIERGE À L'ENFANT PAR JEAN-BAPTISTE PIGALLE (1748) ---
  // Sculptée avec LatheGeometry pour un drapé fluide baroque en marbre de Carrare
  const pigalleGroup = new THREE.Group();
  pigalleGroup.position.set(51.45, 2.38, 0);
  interiorDetailGroup.add(pigalleGroup);

  // Piédestal en nuée baroque (grappe de volutes nuageuses + globe & croissant doré)
  const cloudOffsets = [
    [0, 0.35, 0, 0.56],
    [-0.22, 0.28, 0.32, 0.38],
    [-0.18, 0.25, -0.34, 0.36],
    [0.18, 0.30, 0.28, 0.34],
    [0.15, 0.32, -0.26, 0.35],
    [-0.08, 0.58, 0.14, 0.32],
  ];
  cloudOffsets.forEach(([cx, cy, cz, cr]) => {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(cr, 14, 12), matMarbleWhite);
    puff.scale.set(1.0, 0.68, 1.05);
    puff.position.set(cx, cy, cz);
    puff.castShadow = true;
    pigalleGroup.add(puff);
  });
  // Croissant doré sous les pieds de la Vierge
  const crescent = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.045, 8, 20, Math.PI * 1.1), matGold);
  crescent.position.set(-0.32, 0.62, 0);
  crescent.rotation.set(0, Math.PI * 0.5, -Math.PI * 0.55);
  pigalleGroup.add(crescent);

  // Silhouette sculptée fluide de la Vierge (LatheGeometry du drapé de la robe)
  const robeProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.56, 0.05),
    new THREE.Vector2(0.50, 0.45),
    new THREE.Vector2(0.42, 0.95),
    new THREE.Vector2(0.32, 1.42),
    new THREE.Vector2(0.24, 1.72),
    new THREE.Vector2(0.30, 2.02),
    new THREE.Vector2(0.26, 2.24),
    new THREE.Vector2(0.11, 2.34),
  ];
  const robeMesh = new THREE.Mesh(new THREE.LatheGeometry(robeProfile, 24), matMarbleWhite);
  robeMesh.position.y = 0.68;
  robeMesh.castShadow = true;
  pigalleGroup.add(robeMesh);

  // Manteau drapé en diagonale (plis baroques)
  const mantle = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.54, 1.45, 16, 1, true, 0.4, Math.PI * 1.35), matMarbleWhiteDouble);
  mantle.position.set(0.03, 1.65, -0.02);
  mantle.rotation.z = 0.14;
  pigalleGroup.add(mantle);

  // Tête légèrement inclinée avec tendresse vers l'Enfant + voile retombant sur les épaules
  const virginHead = new THREE.Mesh(new THREE.SphereGeometry(0.20, 16, 14), matMarbleWhite);
  virginHead.scale.set(0.95, 1.12, 0.92);
  virginHead.position.set(-0.06, 3.16, 0.03);
  virginHead.rotation.z = 0.18;
  pigalleGroup.add(virginHead);

  const veil = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 16, 12, -Math.PI * 0.4, Math.PI * 1.15, 0, Math.PI * 0.72),
    matMarbleWhite
  );
  veil.position.set(0.01, 3.18, 0.01);
  pigalleGroup.add(veil);

  // Bras droit & bras gauche portant l'Enfant Jésus
  const leftArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.46, 6, 10), matMarbleWhite);
  leftArm.position.set(-0.22, 2.55, 0.24);
  leftArm.rotation.set(0.65, 0, 0.42);
  pigalleGroup.add(leftArm);

  const rightArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.44, 6, 10), matMarbleWhite);
  rightArm.position.set(-0.22, 2.48, -0.18);
  rightArm.rotation.set(-0.55, 0, 0.45);
  pigalleGroup.add(rightArm);

  // Enfant Jésus sculpté (corps, petite tête, bras tendu)
  const childBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.36, 8, 12), matMarbleWhite);
  childBody.position.set(-0.34, 2.66, 0.18);
  childBody.rotation.set(0.32, 0.2, 0.22);
  pigalleGroup.add(childBody);
  const childHead = new THREE.Mesh(new THREE.SphereGeometry(0.125, 14, 12), matMarbleWhite);
  childHead.position.set(-0.36, 2.94, 0.24);
  pigalleGroup.add(childHead);

  // Couronne d'étoiles / auréole dorée
  const virginHalo = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.025, 8, 28), matGold);
  virginHalo.position.set(0.05, 3.24, 0.03);
  virginHalo.rotation.y = Math.PI * 0.5;
  pigalleGroup.add(virginHalo);

  /**
   * ==========================================================================
   * 7. TOITURES EN ARDOISE PENTUES & FLÈCHE DE CROISÉE
   * ==========================================================================
   */
  const roofGroup = new THREE.Group();
  roofGroup.name = 'ToituresArdoise';
  exteriorGroup.add(roofGroup);

  const createPitchedRoof = (length, span, height, x, y, z, rotY = 0) => {
    const shape = new THREE.Shape();
    shape.moveTo(-span * 0.5, 0);
    shape.lineTo(span * 0.5, 0);
    shape.lineTo(0, height);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false });
    geo.translate(0, 0, -length * 0.5);
    const mesh = new THREE.Mesh(geo, matSlate);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    roofGroup.add(mesh);
    return mesh;
  };

  // Grand comble en ardoise Nef + Croisée + Chœur (posé proprement au-dessus des voûtes à 33.5m)
  createPitchedRoof(71.2, 13.4, 10.2, -9.0, 34.0, 0, Math.PI * 0.5);
  // Crête de faîtage en plomb/or
  addBox(70.5, 0.65, 0.28, -9.0, 44.4, 0, matLead, { parent: roofGroup });

  // Grand comble du Transept (Nord-Sud, z = -22.2 .. +22.2)
  createPitchedRoof(44.6, 13.4, 10.2, 4.0, 34.0, 0, 0);
  addBox(0.28, 0.65, 44.0, 4.0, 44.4, 0, matLead, { parent: roofGroup });

  // Toiture conique du chevet (Est)
  const apseRoof = new THREE.Mesh(new THREE.ConeGeometry(7.0, 10.4, 14, 1, false, 0, Math.PI), matSlate);
  apseRoof.position.set(apseCenterX, 39.2, 0);
  apseRoof.castShadow = true;
  roofGroup.add(apseRoof);

  // Toitures en appentis sur les doubles bas-côtés (calées à l'extérieur des murs du triforium -> zéro intrusion !)
  const addAisleRoofs = (cx, len) => {
    [-1, 1].forEach((side) => {
      const innerRoof = new THREE.Mesh(new THREE.BoxGeometry(len, 0.48, 6.4), matSlate);
      innerRoof.position.set(cx, 20.1, side * 9.85);
      innerRoof.rotation.x = side * 0.25;
      innerRoof.castShadow = true;
      innerRoof.receiveShadow = true;
      roofGroup.add(innerRoof);

      const outerRoof = new THREE.Mesh(new THREE.BoxGeometry(len, 0.46, 6.4), matSlate);
      outerRoof.position.set(cx, 14.0, side * 16.0);
      outerRoof.rotation.x = side * 0.24;
      outerRoof.castShadow = true;
      outerRoof.receiveShadow = true;
      roofGroup.add(outerRoof);
    });
  };
  addAisleRoofs(-22, 41.5); // Nef
  addAisleRoofs(18, 16.5);  // Chœur

  // Toiture annulaire du déambulatoire & chapelles rayonnantes
  const ambRoof = new THREE.Mesh(
    new THREE.CylinderGeometry(6.8, 19.6, 5.2, 20, 1, false, 0, Math.PI),
    matSlate
  );
  ambRoof.position.set(apseCenterX, 16.2, 0);
  ambRoof.castShadow = true;
  roofGroup.add(ambRoof);

  // Clocheton / Flèche de croisée élégante (x = 4, z = 0, s'élevant jusqu'à 57m)
  const fleche = new THREE.Group();
  fleche.position.set(4.0, 43.4, 0);
  roofGroup.add(fleche);
  addCylinder(1.85, 2.05, 3.2, 8, 0, 1.6, 0, matLead, { parent: fleche });
  addCylinder(1.35, 1.45, 4.2, 8, 0, 5.3, 0, matCopperPatina, { parent: fleche });
  const spire = new THREE.Mesh(new THREE.ConeGeometry(1.42, 7.2, 8), matLead);
  spire.position.y = 11.0;
  spire.castShadow = true;
  fleche.add(spire);
  addBox(0.16, 2.2, 0.16, 0, 15.4, 0, matGold, { parent: fleche });
  addBox(0.14, 0.16, 1.0, 0, 15.8, 0, matGold, { parent: fleche });

  /**
   * ==========================================================================
   * 8. CHEFS-D'ŒUVRE INTÉRIEURS & MOBILIER LITURGIQUE
   * - Le Grand Orgue (8 000 tuyaux) au-dessus du portail Ouest (POI 3)
   * - Le Tombeau de Colbert dans le déambulatoire Nord-Est (POI 5)
   * - Le Triptyque de Keith Haring dans une chapelle Nord (POI 6)
   * - Maître-Autel, bancs en bois & Chaire à prêcher
   * ==========================================================================
   */

  // --- A. LE GRAND ORGUE MONUMENTAL (x = -42.5, y = 8.4 .. 25.5, z = 0) ---
  const organGroup = new THREE.Group();
  organGroup.position.set(-42.5, 8.4, 0);
  interiorDetailGroup.add(organGroup);

  // Tribune en pierre Renaissance soutenant l'orgue (laisse 8.4m libres au-dessus du portail central !)
  addBox(4.8, 0.9, 11.8, 0.1, 0, 0, matStoneTrim, { parent: organGroup });
  addBox(0.35, 1.25, 11.8, 2.35, 1.05, 0, matStoneTrim, { parent: organGroup });
  // Balustres de la tribune Renaissance
  for (let bz = -5.2; bz <= 5.2; bz += 0.65) {
    addCylinder(0.08, 0.1, 1.05, 8, 2.35, 1.0, bz, matStoneInt, { parent: organGroup });
  }
  [-4.6, 4.6].forEach((oz) => {
    addCylinder(0.42, 0.48, 8.0, 12, 1.4, -4.0, oz, matStoneTrim, { parent: organGroup });
  });

  // Grand buffet en chêne sculpté (Victor Baltard) + entablement doré
  addBox(2.5, 11.4, 10.8, -0.4, 6.2, 0, matWoodOrgan, { parent: organGroup });
  addBox(2.8, 0.55, 11.2, -0.3, 12.1, 0, matWoodDark, { parent: organGroup });
  addBox(2.9, 0.18, 11.3, -0.3, 12.45, 0, matGold, { parent: organGroup });
  // Positif de dos (petit buffet avancé face à la nef) + console 5 claviers
  addBox(1.15, 4.3, 5.0, 1.55, 2.95, 0, matWoodOrgan, { parent: organGroup });
  addBox(1.3, 0.25, 5.2, 1.55, 5.2, 0, matGold, { parent: organGroup });
  addBox(0.85, 1.35, 1.8, 0.8, 1.12, 0, matWoodDark, { parent: organGroup });
  addBox(0.18, 0.55, 1.45, 1.24, 1.38, 0, matMarbleWhite, { parent: organGroup }); // 5 claviers

  // 5 grandes tourelles de tuyaux d'orgue en étain brillant avec claire-voies & couronnements dorés
  const towerSpecs = [
    { z: -4.4, h: 12.8, r: 0.96 },
    { z: -2.2, h: 10.6, r: 0.74 },
    { z: 0.0,  h: 14.2, r: 1.12 },
    { z: 2.2,  h: 10.6, r: 0.74 },
    { z: 4.4,  h: 12.8, r: 0.96 },
  ];
  towerSpecs.forEach((tw, idx) => {
    // Cul-de-lampe sculpté & corniche dorée de tourelle
    addCylinder(tw.r, tw.r * 0.42, 1.4, 12, 0.8, 1.8, tw.z, matWoodOrgan, { parent: organGroup });
    addCylinder(tw.r * 1.12, tw.r * 1.0, 0.72, 12, 0.8, tw.h + 1.65, tw.z, matGold, { parent: organGroup });
    // Couronnement / dôme ajouré doré sur les tourelles majeures
    const crownDome = new THREE.Mesh(
      new THREE.ConeGeometry(tw.r * 0.88, idx === 2 ? 2.1 : 1.45, 8),
      matWoodOrgan
    );
    crownDome.position.set(0.8, tw.h + 2.75, tw.z);
    organGroup.add(crownDome);
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), matGold);
    finial.position.set(0.8, tw.h + (idx === 2 ? 3.9 : 3.55), tw.z);
    organGroup.add(finial);

    // Faisceau de tuyaux cylindriques brillants (bouches dorées au pied)
    for (let p = -2; p <= 2; p++) {
      const angle = p * 0.42;
      const px = 0.8 + Math.cos(angle) * (tw.r * 0.74);
      const pz = tw.z + Math.sin(angle) * (tw.r * 0.74);
      const pipeH = tw.h - Math.abs(p) * 0.52;
      addCylinder(0.11, 0.085, pipeH, 10, px, 2.35 + pipeH * 0.5, pz, matTinPipes, { cast: false, parent: organGroup });
      addCylinder(0.115, 0.04, 0.65, 8, px, 2.35, pz, matGold, { cast: false, parent: organGroup });
    }
  });
  // Plates-faces de tuyaux intermédiaires disposés en mitre (profil en V élégant)
  for (let pz = -3.7; pz <= 3.7; pz += 0.28) {
    if (Math.abs(pz) > 0.75 && Math.abs(Math.abs(pz) - 2.2) > 0.62 && Math.abs(Math.abs(pz) - 4.4) > 0.78) {
      const localDist = Math.min(Math.abs(Math.abs(pz) - 1.1), Math.abs(Math.abs(pz) - 3.3));
      const pH = 7.4 - localDist * 1.4;
      addCylinder(0.06, 0.05, pH, 6, 0.88, 2.6 + pH * 0.5, pz, matTinPipes, { cast: false, parent: organGroup });
    }
  }
  for (let pz = -2.1; pz <= 2.1; pz += 0.24) {
    const pH = 3.2 - Math.abs(pz) * 0.35;
    addCylinder(0.048, 0.042, pH, 6, 2.14, 1.7 + pH * 0.5, pz, matTinPipes, { cast: false, parent: organGroup });
  }

  // --- B. LE TOMBEAU DE COLBERT (Charles Le Brun & Coysevox / Tuby, 1685) (POI 5) ---
  const colbertGroup = new THREE.Group();
  colbertGroup.position.set(34.5, 0.405, -13.2);
  colbertGroup.rotation.y = -0.62;
  interiorDetailGroup.add(colbertGroup);

  // Double estrade de marbre blanc & noir
  addBox(5.2, 0.22, 3.4, 0, 0.11, 0, matMarbleVeined, { parent: colbertGroup });
  addBox(4.6, 0.20, 2.9, 0, 0.32, 0, matMarbleWhite, { parent: colbertGroup });

  // Architecture funéraire baroque en fond : colonnes corinthiennes jumelées en marbre noir + fronton brisé & blason
  addBox(4.8, 5.6, 0.48, 0, 3.2, -1.25, matMarbleBlack, { parent: colbertGroup });
  [-2.05, -1.55, 1.55, 2.05].forEach((cx) => {
    addCylinder(0.16, 0.18, 4.7, 12, cx, 3.05, -0.98, matMarbleBlack, { parent: colbertGroup });
    addCylinder(0.22, 0.16, 0.36, 10, cx, 5.5, -0.98, matGold, { parent: colbertGroup });
  });
  addBox(5.2, 0.45, 0.82, 0, 5.9, -1.12, matMarbleVeined, { parent: colbertGroup });
  // Médaillon armorié doré de Colbert au fronton
  const crest = new THREE.Mesh(new THREE.SphereGeometry(0.52, 14, 12), matGold);
  crest.scale.set(1.1, 1.35, 0.45);
  crest.position.set(0, 6.65, -1.0);
  colbertGroup.add(crest);

  // Sarcophage profilé en marbre noir sur volutes dorées + table supérieure en marbre blanc
  addBox(3.1, 0.28, 1.55, 0, 0.56, -0.1, matMarbleBlack, { parent: colbertGroup });
  [-1.15, 1.15].forEach((cx) => {
    addBox(0.38, 0.52, 1.2, cx, 0.94, -0.1, matGold, { parent: colbertGroup });
  });
  addBox(2.95, 0.96, 1.38, 0, 1.56, -0.1, matMarbleBlack, { parent: colbertGroup });
  addBox(1.5, 0.55, 0.08, 0, 1.56, 0.61, matGold, { parent: colbertGroup }); // Cartouche épitaphe doré
  addBox(3.2, 0.18, 1.58, 0, 2.12, -0.1, matMarbleWhite, { parent: colbertGroup });

  // Statue agenouillée en marbre blanc de Jean-Baptiste Colbert (manteau de l'Ordre du Saint-Esprit)
  const colbertProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.58, 0.04),
    new THREE.Vector2(0.46, 0.48),
    new THREE.Vector2(0.34, 0.92),
    new THREE.Vector2(0.28, 1.24),
    new THREE.Vector2(0.14, 1.38),
  ];
  const colbertBody = new THREE.Mesh(new THREE.LatheGeometry(colbertProfile, 18), matMarbleWhite);
  colbertBody.position.set(-0.32, 2.22, -0.08);
  colbertBody.castShadow = true;
  colbertGroup.add(colbertBody);
  // Coussin de prière en marbre veiné & mains jointes
  addBox(0.52, 0.18, 0.48, -0.22, 2.28, -0.05, matMarbleVeined, { parent: colbertGroup });
  const colbertHead = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 12), matMarbleWhite);
  colbertHead.position.set(-0.24, 3.74, -0.06);
  colbertGroup.add(colbertHead);
  // Perruque Louis XIV sculptée
  const wig = new THREE.Mesh(new THREE.SphereGeometry(0.23, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.65), matMarbleWhite);
  wig.position.set(-0.28, 3.78, -0.08);
  colbertGroup.add(wig);

  // Ange agenouillé présentant le livre ouvert à Colbert, avec deux ailes déployées
  const angelBody = new THREE.Mesh(new THREE.LatheGeometry(colbertProfile, 14), matMarbleWhite);
  angelBody.scale.set(0.75, 0.82, 0.75);
  angelBody.position.set(0.76, 2.22, -0.04);
  colbertGroup.add(angelBody);
  const angelHead = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), matMarbleWhite);
  angelHead.position.set(0.72, 3.45, -0.04);
  colbertGroup.add(angelHead);
  [-0.2, 0.2].forEach((wz) => {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.85, 0.32), matMarbleWhite);
    wing.position.set(1.02, 3.25, wz);
    wing.rotation.set(wz > 0 ? 0.35 : -0.35, 0, -0.45);
    colbertGroup.add(wing);
  });
  addBox(0.34, 0.08, 0.42, 0.34, 3.05, -0.04, matGold, { parent: colbertGroup }); // Livre ouvert

  // Deux grandes figures allégoriques drapées latérales (La Fidélité & L'Abondance)
  const allegProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.46, 0.05),
    new THREE.Vector2(0.38, 0.7),
    new THREE.Vector2(0.26, 1.35),
    new THREE.Vector2(0.30, 1.75),
    new THREE.Vector2(0.12, 1.96),
  ];
  [-2.02, 2.02].forEach((ax, idx) => {
    const alleg = new THREE.Mesh(new THREE.LatheGeometry(allegProfile, 18), matMarbleWhite);
    alleg.position.set(ax, 0.42, 0.18);
    alleg.castShadow = true;
    colbertGroup.add(alleg);
    const aHead = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), matMarbleWhite);
    aHead.position.set(ax, 2.52, 0.18);
    colbertGroup.add(aHead);
    // Attribut doré (corne d'abondance à droite, sceptre/croix à gauche)
    const attr = new THREE.Mesh(
      idx === 1 ? new THREE.ConeGeometry(0.14, 0.72, 10) : new THREE.CylinderGeometry(0.03, 0.03, 1.15, 8),
      matGold
    );
    attr.position.set(ax + (idx === 1 ? 0.24 : -0.24), 1.78, 0.32);
    attr.rotation.z = idx === 1 ? -0.45 : 0.22;
    colbertGroup.add(attr);
  });
  circleColliders.push({ x: 34.5, z: -13.2, r: 2.4 });

  // --- C. LE TRIPTYQUE DE KEITH HARING ("La Vie du Christ", 1990) (POI 6) ---
  const haringGroup = new THREE.Group();
  haringGroup.position.set(-14.0, 0.405, -17.5);
  interiorDetailGroup.add(haringGroup);

  // Autel contemporain sobre en pierre foncée
  addBox(3.4, 1.05, 1.25, 0, 0.53, 0, matMarbleBlack, { collide: false, parent: haringGroup });
  circleColliders.push({ x: -14.0, z: -17.5, r: 1.5 });

  const matHaringPanel = new THREE.MeshStandardMaterial({
    map: texHaring,
    roughness: 0.32,
    metalness: 0.72,
    emissive: new THREE.Color(0x523c14),
    emissiveIntensity: 0.25,
  });

  // Panneau central du triptyque en bronze patiné or blanc
  addBox(1.85, 2.35, 0.14, 0, 2.38, -0.25, matHaringPanel, { parent: haringGroup });
  // Volet gauche (légèrement replié vers l'avant)
  const leftWing = addBox(0.95, 2.32, 0.12, -1.32, 2.38, -0.02, matHaringPanel, { parent: haringGroup });
  leftWing.rotation.y = 0.46;
  // Volet droit (légèrement replié vers l'avant)
  const rightWing = addBox(0.95, 2.32, 0.12, 1.32, 2.38, -0.02, matHaringPanel, { parent: haringGroup });
  rightWing.rotation.y = -0.46;

  // --- D. MAÎTRE-AUTEL, STALLES DU CHŒUR, CHAIRE À PRÊCHER & BANCS EN BOIS ---
  // Plateforme surélevée du sanctuaire en 3 gradins propres (zéro coplanarité avec y = 0.40)
  addBox(14.2, 0.15, 11.4, 18.5, 0.48, 0, matMarbleVeined, { cast: false, receive: true, parent: interiorDetailGroup });
  addBox(13.6, 0.15, 10.8, 18.5, 0.63, 0, matMarbleWhite, { cast: false, receive: true, parent: interiorDetailGroup });
  addBox(13.0, 0.16, 10.2, 18.5, 0.785, 0, matMarbleVeined, { cast: false, receive: true, parent: interiorDetailGroup });
  // Tapis cramoisi du chœur bordé d'or
  addBox(9.2, 0.024, 4.4, 17.5, 0.878, 0, matCrimsonVelvet, { cast: false, receive: true, parent: interiorDetailGroup });
  addBox(9.2, 0.026, 0.1, 17.5, 0.88, -2.1, matGold, { cast: false, parent: interiorDetailGroup });
  addBox(9.2, 0.026, 0.1, 17.5, 0.88, 2.1, matGold, { cast: false, parent: interiorDetailGroup });

  // Maître-autel monumental en marbre blanc, marbre noir & bronze doré
  addBox(1.85, 1.18, 4.4, 18.2, 1.46, 0, matMarbleWhite, { collide: true, parent: interiorDetailGroup });
  addBox(2.05, 0.16, 4.65, 18.2, 2.11, 0, matGold, { parent: interiorDetailGroup });
  addBox(0.24, 0.88, 3.4, 17.28, 1.46, 0, matMarbleBlack, { parent: interiorDetailGroup });
  addBox(0.26, 0.66, 2.9, 17.24, 1.46, 0, matGold, { parent: interiorDetailGroup });
  // Croix d'autel & 6 chandeliers dorés baroques avec cierges
  addBox(0.12, 1.75, 0.12, 18.2, 3.04, 0, matGold, { cast: false, parent: interiorDetailGroup });
  addBox(0.1, 0.12, 0.76, 18.2, 3.46, 0, matGold, { cast: false, parent: interiorDetailGroup });
  [-1.7, -1.25, -0.8, 0.8, 1.25, 1.7].forEach((cz) => {
    addCylinder(0.05, 0.12, 0.72, 10, 18.2, 2.55, cz, matGold, { cast: false, parent: interiorDetailGroup });
    addCylinder(0.032, 0.034, 0.42, 8, 18.2, 3.12, cz, matMarbleWhite, { cast: false, parent: interiorDetailGroup });
  });

  // Stalles sculptées en chêne sombre bordant le Chœur (Nord & Sud)
  [-4.45, 4.45].forEach((sz) => {
    const sign = Math.sign(sz);
    addBox(9.6, 2.4, 0.45, 17.8, 2.06, sz, matWoodDark, { parent: interiorDetailGroup });
    addBox(9.6, 0.65, 0.95, 17.8, 1.2, sz - sign * 0.42, matWoodOrgan, { parent: interiorDetailGroup });
    addBox(9.8, 0.18, 0.65, 17.8, 3.3, sz - sign * 0.08, matGold, { parent: interiorDetailGroup });
  });

  // Bancs en bois dans la Grande Nef (allée centrale large de 4.6m totalement libre !)
  const pewGeoSeat = new THREE.BoxGeometry(0.55, 0.12, 3.1);
  const pewGeoBack = new THREE.BoxGeometry(0.1, 0.78, 3.1);
  const pewGeoLeg = new THREE.BoxGeometry(0.45, 0.55, 0.12);
  for (let px = -35.5; px <= -6.5; px += 2.2) {
    [-3.9, 3.9].forEach((pz) => {
      const pew = new THREE.Group();
      pew.position.set(px, 0.4, pz);
      const seat = new THREE.Mesh(pewGeoSeat, matWoodDark);
      seat.position.y = 0.52;
      seat.castShadow = false;
      seat.receiveShadow = true;
      pew.add(seat);
      const back = new THREE.Mesh(pewGeoBack, matWoodDark);
      back.position.set(-0.24, 0.82, 0);
      back.castShadow = false;
      pew.add(back);
      [-1.35, 1.35].forEach((lz) => {
        const leg = new THREE.Mesh(pewGeoLeg, matWoodDark);
        leg.position.set(0, 0.28, lz);
        pew.add(leg);
      });
      interiorDetailGroup.add(pew);
    });
  }

  // Chaire à prêcher sculptée adossée au pilier Nord (x = -18, z = -4.5)
  const pulpit = new THREE.Group();
  pulpit.position.set(-18.0, 0.4, -4.4);
  interiorDetailGroup.add(pulpit);
  addCylinder(0.45, 0.75, 2.8, 8, 0, 1.4, 0, matWoodDark, { parent: pulpit });
  addCylinder(1.25, 1.05, 1.35, 8, 0, 3.35, 0, matWoodOrgan, { parent: pulpit });
  // Abat-voix acoustique surmonté d'un fleuron doré
  addCylinder(1.45, 1.55, 0.45, 8, 0, 6.2, 0, matWoodOrgan, { parent: pulpit });
  const canopyTop = new THREE.Mesh(new THREE.ConeGeometry(1.1, 1.2, 8), matGold);
  canopyTop.position.y = 7.0;
  pulpit.add(canopyTop);
  circleColliders.push({ x: -18.0, z: -4.4, r: 1.2 });

  /**
   * ==========================================================================
   * 9. ENVIRONNEMENT PARISIEN HAUTE FIDÉLITÉ (module js/monuments/saint-eustache-env.js)
   *    Rue du Jour, Rue de Turbigo, Rue Rambuteau, Rue Coquillière,
   *    Îlots Haussmanniens 3D détaillés & Jardin Nelson-Mandela paysager
   * ==========================================================================
   */
  const envGroup = buildParisEnvironment(root, {
    matStoneExt,
    matStoneFacade,
    matStoneTrim,
    matLead,
    matWoodOrgan,
    matGold,
    colliders,
    circleColliders,
    streetLampEmissives,
  });
  envGroup.userData.keepGroup = true;

  // Fusion haute performance par matériau de toute la cathédrale et des Halles (zéro perte de détail)
  mergeStaticGroupByMaterial(exteriorGroup);
  mergeStaticGroupByMaterial(interiorDetailGroup);
  mergeStaticGroupByMaterial(envGroup, {
    skipPredicate: (obj) => {
      const mpg = envGroup.userData.microPropsGroup;
      let p = obj.parent;
      while (p && p !== envGroup) {
        if (p === mpg) return true;
        p = p.parent;
      }
      return false;
    },
  });

  // Limite douce du périmètre d'exploration piéton élargie jusqu'au Jardin Nelson-Mandela & rues adjacentes
  const worldBounds = { minX: -84, maxX: 82, minZ: -48, maxZ: 98 };

  return {
    root,
    exteriorGroup,
    interiorDetailGroup,
    envGroup,
    colliders,
    circleColliders,
    stainedGlassMaterials,
    streetLampEmissives,
    worldBounds,
  };
}
