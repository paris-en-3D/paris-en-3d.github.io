import * as THREE from 'three';

/**
 * ============================================================================
 * DONNÉES GÉOGRAPHIQUES DE PARIS À L'ÉCHELLE RÉELLE 1:1 (1 unité = 1 mètre)
 * Origine (0, 0, 0) : Église Saint-Eustache (48.8634° N, 2.3450° E)
 * Axes : +X = Est | -X = Ouest | +Z = Sud | -Z = Nord | +Y = Altitude (m)
 * ============================================================================
 */

export const ORIGIN_GPS = { lat: 48.8634, lon: 2.3450 };
const METERS_PER_DEG_LON = 73150;
const METERS_PER_DEG_LAT = 111195;

export function gpsToMeters(lat, lon) {
  return {
    x: Math.round((lon - ORIGIN_GPS.lon) * METERS_PER_DEG_LON),
    z: Math.round(-(lat - ORIGIN_GPS.lat) * METERS_PER_DEG_LAT),
  };
}

/**
 * Relief doux parisien (Butte Montmartre, Montagne Sainte-Geneviève, Étoile)
 * Garantit 0 m exactement autour de Saint-Eustache, de la Seine et de la Tour Eiffel.
 */
export function getParisElevation(x, z) {
  // Zones strictement plates à y = 0 pour les monuments détaillés et le lit de la Seine
  const dEustache = Math.hypot(x, z);
  if (dEustache < 320) return 0;

  const dEiffel = Math.hypot(x - (-3694), z - 556);
  if (dEiffel < 550) return 0;

  // Atténuation douce près de la Seine pour que les quais restent plats
  const dSeine = distanceToPolyline(x, z, SEINE_POINTS);
  const seineFlatFactor = THREE.MathUtils.smoothstep(dSeine, 120, 320);

  // 1. Butte Montmartre (-139, -2591) : +90m
  const dMontmartreSq = (x + 139) ** 2 + (z + 2591) ** 2;
  const hMontmartre = 90 * Math.exp(-dMontmartreSq / (2 * 440 ** 2));

  // 2. Montagne Sainte-Geneviève (+102, +1913) : +26m
  const dGenevieveSq = (x - 102) ** 2 + (z - 1913) ** 2;
  const hGenevieve = 26 * Math.exp(-dGenevieveSq / (2 * 380 ** 2));

  // 3. Butte de l'Étoile (-3658, -1156) : plateau nivelé +18m sur rayon 142m pour le Rond-Point & Hôtels des Maréchaux
  const dEtoile = Math.hypot(x + 3658, z + 1156);
  const rEtoileEff = Math.max(0, dEtoile - 142);
  const hEtoile = 18 * Math.exp(-(rEtoileEff * rEtoileEff) / (2 * 340 ** 2));

  // 4. Colline de Chaillot / Trocadéro (-4110, +160) : +22m hors esplanade immédiate
  const dChaillotSq = (x + 4140) ** 2 + (z - 110) ** 2;
  const hChaillot = 20 * Math.exp(-dChaillotSq / (2 * 300 ** 2));

  const raw = hMontmartre + hGenevieve + hEtoile + hChaillot;
  // Atténuation douce aux abords de Saint-Eustache & Tour Eiffel
  const eustacheFactor = THREE.MathUtils.smoothstep(dEustache, 320, 620);
  const eiffelFactor = THREE.MathUtils.smoothstep(dEiffel, 550, 920);

  return raw * seineFlatFactor * eustacheFactor * eiffelFactor;
}

/**
 * Polyline GPS convertie en mètres du vrai méandre de la Seine traversant Paris
 * D'Est-Sud-Est (Bercy) à Ouest-Sud-Ouest (Boulogne)
 */
const SEINE_GPS = [
  [48.8360, 2.3820], // Bercy / Tolbiac
  [48.8425, 2.3715], // Pont d'Austerlitz
  [48.8495, 2.3610], // Sully / Pointe Est Île Saint-Louis
  [48.8535, 2.3530], // Île de la Cité / Notre-Dame
  [48.8572, 2.3412], // Pont Neuf
  [48.8588, 2.3340], // Pont des Arts / Louvre
  [48.8615, 2.3220], // Pont Royal / Solférino
  [48.8634, 2.3185], // Pont de la Concorde
  [48.8638, 2.3135], // Pont Alexandre-III
  [48.8635, 2.3018], // Pont de l'Alma
  [48.86266, 2.29737], // Passerelle Debilly (amorce de la courbe)
  [48.86151, 2.29507], // Quai Branly Est / Amont Pont d'Iéna (lx = +270, lz = -220)
  [48.85982, 2.29241], // Pont d'Iéna (axe exact Tour Eiffel <-> Trocadéro, lx = 0, lz = -220)
  [48.85814, 2.28976], // Port de Suffren / Aval Pont d'Iéna (lx = -270, lz = -220)
  [48.85667, 2.28793], // Approche Île aux Cygnes
  [48.85440, 2.28640], // Pont de Bir-Hakeim / Passy
  [48.8495, 2.2800], // Grenelle / Allée des Cygnes
  [48.8415, 2.2660], // Garigliano / Sortie Paris
];

export const SEINE_POINTS = SEINE_GPS.map(([lat, lon]) => gpsToMeters(lat, lon));

export function distanceToPolyline(x, z, pts) {
  let minSq = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const ax = pts[i].x;
    const az = pts[i].z;
    const bx = pts[i + 1].x;
    const bz = pts[i + 1].z;
    const dx = bx - ax;
    const dz = bz - az;
    const lenSq = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lenSq));
    const px = ax + t * dx;
    const pz = az + t * dz;
    const dSq = (x - px) ** 2 + (z - pz) ** 2;
    if (dSq < minSq) minSq = dSq;
  }
  return Math.sqrt(minSq);
}

/**
 * Grands ponts sur la Seine (le Pont d'Iéna est modélisé en haute fidélité dans tour-eiffel.js)
 */
export const BRIDGES = [
  { name: 'Pont d\'Austerlitz',  lat: 48.8453, lon: 2.3652, width: 22, span: 158 },
  { name: 'Pont Sully',          lat: 48.8505, lon: 2.3586, width: 20, span: 195 },
  { name: 'Pont Neuf',           lat: 48.8571, lon: 2.3414, width: 21, span: 230 },
  { name: 'Pont des Arts',       lat: 48.8584, lon: 2.3375, width: 11, span: 156, pedestrian: true },
  { name: 'Pont de la Concorde', lat: 48.8634, lon: 2.3196, width: 25, span: 156 },
  { name: 'Pont Alexandre-III',  lat: 48.8639, lon: 2.3136, width: 40, span: 162, ornate: true },
  { name: 'Pont de l\'Alma',     lat: 48.8633, lon: 2.3017, width: 24, span: 152 },
  { name: 'Pont de Bir-Hakeim',  lat: 48.8556, lon: 2.2872, width: 24, span: 168, twoLevel: true },
];

/**
 * Les 12 Monuments Emblématiques de Paris à l'échelle 1:1
 */
const RAW_MONUMENTS = [
  {
    id: 'saint-eustache',
    name: 'Église Saint-Eustache',
    shortName: 'Saint-Eustache',
    district: '1er arr. • Quartier des Halles',
    era: '1532 – 1788 • Gothique & Renaissance',
    status: 'detailed',
    lat: 48.8634,
    lon: 2.3450,
    groundY: 0,
    defaultCameraPos: new THREE.Vector3(-92, 33, 42),
    defaultTarget: new THREE.Vector3(-10, 16, 0),
    orbit360Config: { center: new THREE.Vector3(-2, 16, 0), rx: 94, rz: 74, baseHeight: 36, duration: 30, startAngle: Math.PI * 0.82 },
    shadowRadius: 115,
    exclusionRadius: 210,
    summary:
      "Chef-d'œuvre monumental du cœur de Paris mêlant structure gothique flamboyant (33,5 m sous voûte) et décor Renaissance, complété au XVIIIe siècle par une façade classique asymétrique.",
  },
  {
    id: 'tour-eiffel',
    name: 'La Tour Eiffel',
    shortName: 'Tour Eiffel',
    district: '7e arr. • Champ-de-Mars',
    era: '1887 – 1889 • Fer puddlé (330 m)',
    status: 'detailed',
    lat: 48.8584,
    lon: 2.2945,
    groundY: 0,
    // Angle panoramique depuis le Trocadéro / Pont d'Iéna embrassant toute la Dame de Fer (330m)
    defaultCameraPos: new THREE.Vector3(-3995, 92, 220),
    defaultTarget: new THREE.Vector3(-3694, 138, 556),
    orbit360Config: { center: new THREE.Vector3(-3694, 135, 556), rx: 285, rz: 285, baseHeight: 165, duration: 34, startAngle: -Math.PI * 0.65 },
    shadowRadius: 270,
    exclusionRadius: 560,
    summary:
      "Érigée par Gustave Eiffel pour l'Exposition universelle de 1889, la Dame de Fer culmine à 330 mètres de hauteur au bout du Champ-de-Mars face au Pont d'Iéna et au Trocadéro.",
  },
  {
    id: 'pompidou',
    name: 'Centre Georges-Pompidou',
    shortName: 'Centre Pompidou',
    district: '4e arr. • Beaubourg',
    era: '1971 – 1977 • Piano & Rogers',
    status: 'lod',
    lat: 48.8606,
    lon: 2.3522,
    groundY: 0,
    shadowRadius: 140,
    exclusionRadius: 112,
    summary:
      "Architecture high-tech de Renzo Piano et Richard Rogers révélant à l'extérieur son squelette d'acier et ses gaines colorées (bleu pour l'air, vert pour l'eau, jaune pour l'électricité, rouge pour la circulation).",
  },
  {
    id: 'notre-dame',
    name: 'Cathédrale Notre-Dame de Paris',
    shortName: 'Notre-Dame',
    district: '4e arr. • Île de la Cité',
    era: '1163 – 1345 • Gothique classique',
    status: 'lod',
    lat: 48.8530,
    lon: 2.3499,
    groundY: 0,
    shadowRadius: 150,
    exclusionRadius: 92,
    summary:
      "Symbole gothique de Paris posé sur l'Île de la Cité, reconnaissable à ses deux tours occidentales de 69 mètres, ses arcs-boutants du chœur et sa flèche culminant à 96 mètres.",
  },
  {
    id: 'louvre',
    name: 'Musée du Louvre & Pyramide',
    shortName: 'Musée du Louvre',
    district: '1er arr. • Palais Royal',
    era: 'XIIe – 1989 • Palais royal & I. M. Pei',
    status: 'lod',
    lat: 48.8606,
    lon: 2.3376,
    groundY: 0,
    shadowRadius: 260,
    exclusionRadius: 185,
    summary:
      "Ancien palais des rois de France déployant ses ailes autour de la Cour Napoléon et de la célèbre Pyramide de verre dessinée par Ieoh Ming Pei en 1989.",
  },
  {
    id: 'orsay',
    name: 'Musée d\'Orsay',
    shortName: 'Musée d’Orsay',
    district: '7e arr. • Quai Anatole-France',
    era: '1900 • Gare Beaux-Arts (Victor Laloux)',
    status: 'lod',
    lat: 48.8600,
    lon: 2.3266,
    groundY: 0,
    shadowRadius: 140,
    exclusionRadius: 112,
    summary:
      "Édifiée pour l'Exposition universelle de 1900 face au Louvre, cette ancienne gare ferroviaire abrite sous sa grande voûte verrière la plus riche collection impressionniste au monde.",
  },
  {
    id: 'palais-garnier',
    name: 'Palais Garnier (Opéra)',
    shortName: 'Palais Garnier',
    district: '9e arr. • Place de l’Opéra',
    era: '1861 – 1875 • Second Empire',
    status: 'lod',
    lat: 48.8720,
    lon: 2.3316,
    groundY: 0,
    shadowRadius: 140,
    exclusionRadius: 96,
    summary:
      "Chef-d'œuvre éclectique de Charles Garnier, couronné d'une grande coupole de cuivre patiné vert-de-gris et de groupes sculptés dorés au cœur des Grands Boulevards.",
  },
  {
    id: 'pantheon',
    name: 'Le Panthéon',
    shortName: 'Le Panthéon',
    district: '5e arr. • Montagne Sainte-Geneviève',
    era: '1758 – 1790 • Néoclassicisme (Soufflot)',
    status: 'lod',
    lat: 48.8462,
    lon: 2.3464,
    groundY: 26,
    shadowRadius: 140,
    exclusionRadius: 92,
    summary:
      "Nécropole laïque des grands personnages de la République juchée sur la Montagne Sainte-Geneviève, dotée d'un péristyle corinthien et d'un dôme à colonnade abritant le pendule de Foucault.",
  },
  {
    id: 'grand-palais',
    name: 'Le Grand Palais',
    shortName: 'Grand Palais',
    district: '8e arr. • Champs-Élysées',
    era: '1900 • Beaux-Arts & Verrière',
    status: 'lod',
    lat: 48.8661,
    lon: 2.3125,
    groundY: 0,
    shadowRadius: 180,
    exclusionRadius: 158,
    summary:
      "Immense nef de verre et d'acier vert réséda édifiée pour l'Exposition universelle de 1900 dans la perspective du Pont Alexandre-III.",
  },
  {
    id: 'arc-de-triomphe',
    name: 'Arc de Triomphe de l\'Étoile',
    shortName: 'Arc de Triomphe',
    district: '8e arr. • Place Charles-de-Gaulle',
    era: '1806 – 1836 • Chalgrin & Rude',
    status: 'detailed',
    lat: 48.8738,
    lon: 2.2950,
    groundY: 18,
    defaultCameraPos: new THREE.Vector3(-3552, 52, -1106),
    defaultTarget: new THREE.Vector3(-3658, 41, -1156),
    orbit360Config: { center: new THREE.Vector3(-3658, 42, -1156), rx: 118, rz: 118, baseHeight: 58, duration: 32, startAngle: 0.44 },
    shadowRadius: 165,
    exclusionRadius: 148,
    summary:
      "Monument emblématique haut de 50 mètres érigé par Jean Chalgrin au sommet des Champs-Élysées, abritant la Flamme du Soldat inconnu et offrant depuis sa terrasse panoramique une vue à 360° sur les douze avenues de l'Étoile.",
  },
  {
    id: 'sacre-coeur',
    name: 'Basilique du Sacré-Cœur',
    shortName: 'Sacré-Cœur',
    district: '18e arr. • Butte Montmartre',
    era: '1875 – 1914 • Romano-byzantin',
    status: 'lod',
    lat: 48.8867,
    lon: 2.3431,
    groundY: 90,
    shadowRadius: 140,
    exclusionRadius: 102,
    summary:
      "Perchée à 130 m d'altitude au sommet de la butte Montmartre, sa silhouette en travertin blanc qui blanchit sous la pluie domine tout Paris de ses dômes ovoïdes.",
  },
  {
    id: 'fondation-lv',
    name: 'Fondation Louis Vuitton',
    shortName: 'Fondation Louis Vuitton',
    district: '16e arr. • Bois de Boulogne',
    era: '2014 • Frank Gehry',
    status: 'lod',
    lat: 48.8766,
    lon: 2.2634,
    groundY: 0,
    shadowRadius: 150,
    exclusionRadius: 115,
    summary:
      "Vaisseau contemporain imaginé par Frank Gehry au Jardin d'Acclimatation, composé de douze grandes voiles courbes de verre translucide tendues au-dessus d'un bassin.",
  },
];

export const MONUMENTS = RAW_MONUMENTS.map((m) => {
  const coords = gpsToMeters(m.lat, m.lon);
  const pos = new THREE.Vector3(coords.x, m.groundY, coords.z);
  const defaultCameraPos = m.defaultCameraPos || new THREE.Vector3(coords.x - 125, m.groundY + 58, coords.z + 115);
  const defaultTarget = m.defaultTarget || new THREE.Vector3(coords.x, m.groundY + 22, coords.z);
  const orbit360Config = m.orbit360Config || {
    center: new THREE.Vector3(coords.x, m.groundY + 24, coords.z),
    rx: 135,
    rz: 120,
    baseHeight: m.groundY + 56,
    duration: 28,
    startAngle: Math.PI * 0.75,
  };
  return {
    ...m,
    pos,
    defaultCameraPos,
    defaultTarget,
    orbit360Config,
  };
});

export function getMonumentById(id) {
  return MONUMENTS.find((m) => m.id === id) || MONUMENTS[0];
}
