import * as THREE from 'three';
import { buildSaintEustache } from './saint-eustache-arch.js';

/**
 * ============================================================================
 * MONUMENT COMPLET #1 : ÉGLISE SAINT-EUSTACHE (Origine 0, 0, 0)
 * Architecture intérieure/extérieure + Quartier des Halles + Lumières chaudes
 * + Prologue 360° & 7 Points d'Intérêt historiques.
 * ============================================================================
 */

export const SAINT_EUSTACHE_INTRO = {
  id: 'intro-360',
  title: 'Histoire de Saint-Eustache — Tour 360°',
  era: '1532 – 1788 • 250 ans d’histoire',
  location: 'Survol panoramique • Quartier des Halles, Paris',
  history:
    "Bienvenue à l'église Saint-Eustache, joyau monumental du cœur historique de Paris. Fondée dès le XIIIe siècle près des Halles, l'église actuelle fut mise en chantier en 1532 sous le règne de François Ier et achevée plus d'un siècle plus tard, en 1637. Ses dimensions rivalisent avec celles d'une cathédrale : 105 mètres de long, 43 mètres de large et des voûtes culminant à 33,5 mètres.",
  anecdote:
    "Pendant ce tour panoramique à 360°, observe son extraordinaire métissage architectural : une ossature gothique flamboyant (plan en croix latine, doubles bas-côtés et arcs-boutants) habillée d'un décor Renaissance, complétée au XVIIIe siècle par une façade classique à la tour Sud restée inachevée.",
  voiceover:
    "Bienvenue dans la visite guidée de l'église Saint-Eustache, au cœur du quartier des Halles à Paris. " +
    "Pendant ce survol panoramique à 360 degrés, remontons ensemble l'histoire fascinante de sa construction. " +
    "À l'origine simple chapelle du treizième siècle dédiée au martyr romain saint Eustache, l'édifice actuel fut fondé en 1532 sous le règne de François Premier, pour doter la paroisse la plus peuplée de Paris d'une église digne d'une cathédrale. " +
    "Le chantier s'étendit sur plus d'un siècle, jusqu'en 1637. " +
    "Sa singularité architecturale est unique en France : son plan en croix latine long de 105 mètres, ses doubles bas-côtés, ses grands arcs-boutants et ses voûtes culminant à 33 mètres cinquante relèvent encore du gothique flamboyant, mais toute son ornementation célèbre déjà la Renaissance. " +
    "Au dix-huitième siècle, l'architecte Jean Hardouin-Mansart de Jouy rebâtit sa façade occidentale dans un style classique monumental, laissant la tour Sud inachevée à la veille de la Révolution. " +
    "Allons maintenant découvrir ensemble les sept chefs-d'œuvre incontournables de Saint-Eustache.",
};

export const SAINT_EUSTACHE_POIS = [
  {
    id: 'facade-occidentale',
    title: 'La Façade Occidentale asymétrique',
    shortTitle: 'Façade Occidentale',
    era: '1754 – 1788 • Classicisme',
    location: 'Parvis Ouest • Rue du Jour',
    markerPos: new THREE.Vector3(-51.4, 14.2, 0),
    cameraPos: new THREE.Vector3(-82, 20, 15),
    target: new THREE.Vector3(-46.5, 17.5, 0),
    fpsPos: new THREE.Vector3(-64, 1.75, 4),
    history:
      "Conçue au XVIIIe siècle par l'architecte Jean Hardouin-Mansart de Jouy pour remplacer une façade Renaissance menaçant ruine, cette façade monumentale tranche avec le reste de l'édifice par son pur style classique : deux ordres superposés — dorique au rez-de-chaussée, ionique à l'étage — couronnés d'un puissant fronton triangulaire.",
    anecdote:
      "Observe les deux tours : seule la tour Nord (à gauche) fut achevée. La tour Sud (à droite) resta tronquée à hauteur de la balustrade faute de financement juste avant la Révolution française — une asymétrie devenue la signature visuelle de Saint-Eustache !",
  },
  {
    id: 'grande-nef',
    title: 'La Grande Nef et ses proportions de cathédrale',
    shortTitle: 'Grande Nef (33,5 m)',
    era: '1532 – 1637 • Gothique & Renaissance',
    location: 'Vaisseau central • Intérieur',
    markerPos: new THREE.Vector3(-16, 4.2, 0),
    cameraPos: new THREE.Vector3(-36.5, 4.8, 0),
    target: new THREE.Vector3(6, 17.5, 0),
    fpsPos: new THREE.Vector3(-34.5, 2.15, 0),
    history:
      "Longue de 105 mètres et large de 43 mètres, l'église Saint-Eustache rivalise avec les plus grandes cathédrales. Elle réalise une synthèse unique à Paris : son plan en croix latine à doubles bas-côtés, ses arcs-boutants et ses voûtes sur croisées d'ogives culminant à 33,46 m sont gothiques, tandis que ses piliers fasciculés, pilastres corinthiens et clés pendantes célèbrent la Renaissance.",
    anecdote:
      "Ses voûtes s'élèvent plus haut que celles de Notre-Dame de Paris (33,46 m contre 32,5 m) ! C'est aussi dans cette nef que furent baptisés Molière, Richelieu et Madame de Pompadour, et que Louis XIV fit sa première communion.",
  },
  {
    id: 'grand-orgue',
    title: 'Le Grand Orgue monumental',
    shortTitle: 'Grand Orgue (8 000 tuyaux)',
    era: '1854 / 1989 • Buffet Baltard & Van den Heuvel',
    location: 'Tribune Ouest • Au-dessus du portail',
    markerPos: new THREE.Vector3(-40.2, 13.8, 0),
    cameraPos: new THREE.Vector3(-20.5, 7.6, 0),
    target: new THREE.Vector3(-42.5, 15.2, 0),
    fpsPos: new THREE.Vector3(-25.5, 2.15, 0),
    history:
      "Dressé sur sa tribune Renaissance au-dessus de l'entrée principale, le buffet monumental dessiné par Victor Baltard abrite depuis 1989 un instrument symphonique exceptionnel construit par le facteur néerlandais Jan van den Heuvel : 8 000 tuyaux, 101 jeux et 5 claviers, faisant de lui l'un des plus puissants orgues de France.",
    anecdote:
      "Saint-Eustache est une véritable cathédrale musicale : Hector Berlioz y créa son Te Deum en 1855, Franz Liszt y dirigea sa Messe solennelle de Gran en 1866, et les obsèques de la mère de Mozart y furent célébrées en 1778.",
  },
  {
    id: 'chapelle-vierge',
    title: 'La Chapelle de la Vierge',
    shortTitle: 'Chapelle de la Vierge',
    era: '1748 / 1804 • Jean-Baptiste Pigalle',
    location: 'Chapelle axiale • Fond de l’abside Est',
    markerPos: new THREE.Vector3(48.8, 4.1, 0),
    cameraPos: new THREE.Vector3(41.0, 3.6, 0),
    target: new THREE.Vector3(51.5, 4.1, 0),
    fpsPos: new THREE.Vector3(45.2, 2.15, 0),
    history:
      "Située tout à l'est dans le prolongement du déambulatoire, la chapelle axiale néoclassique fut inaugurée par le pape Pie VII en décembre 1804. Ornée des fresques mariales de Thomas Couture sur ses murs latéraux, son grand retable corinthien à gloire dorée accueille la célèbre Vierge à l'Enfant en marbre blanc de Jean-Baptiste Pigalle.",
    anecdote:
      "Commandée en 1748 pour l'église Saint-Louis des Invalides, la statue de Pigalle fut jugée trop tendre et trop humaine pour un sanctuaire militaire avant d'être sauvée à la Révolution et installée ici en 1804.",
  },
  {
    id: 'tombeau-colbert',
    title: 'Le Tombeau de Colbert',
    shortTitle: 'Tombeau de Colbert',
    era: '1685 – 1687 • Le Brun & Coysevox',
    location: 'Déambulatoire Nord-Est',
    markerPos: new THREE.Vector3(33.2, 3.6, -11.6),
    cameraPos: new THREE.Vector3(30.4, 2.75, -11.2),
    target: new THREE.Vector3(34.5, 2.4, -13.2),
    fpsPos: new THREE.Vector3(30.8, 2.15, -11.4),
    history:
      "Paroissien fidèle de Saint-Eustache, Jean-Baptiste Colbert, célèbre contrôleur général des finances de Louis XIV, repose dans ce monument funéraire baroque conçu par le Premier peintre du roi Charles Le Brun et sculpté dans le marbre par Antoine Coysevox et Jean-Baptiste Tuby.",
    anecdote:
      "Agenouillé en prière sur un sarcophage de marbre noir, Colbert est encadré par deux vertus allégoriques : la Fidélité (par Coysevox) et l'Abondance (par Tuby). L'œuvre fut démontée sous la Révolution puis patiemment remontée ici en 1818.",
  },
  {
    id: 'keith-haring',
    title: 'Le Triptyque de Keith Haring',
    shortTitle: 'Triptyque Keith Haring',
    era: '1990 • Art Contemporain',
    location: 'Chapelle Saint-Vincent-de-Paul • Bas-côté Nord',
    markerPos: new THREE.Vector3(-14.0, 3.8, -16.1),
    cameraPos: new THREE.Vector3(-14.0, 2.8, -12.6),
    target: new THREE.Vector3(-14.0, 2.7, -17.5),
    fpsPos: new THREE.Vector3(-14.0, 2.15, -13.5),
    history:
      "Installé dans une chapelle latérale du bas-côté Nord, « La Vie du Christ » (1990) est un triptyque monumental en bronze patiné recouvert d'or blanc signé par l'artiste américain Keith Haring. Il illustre la tradition vivante de dialogue entre Saint-Eustache et la création contemporaine.",
    anecdote:
      "Achevé quelques semaines seulement avant la mort de Keith Haring en février 1990, ce triptyque constitue son ultime œuvre majeure. Il fait écho au patrimoine des Halles, quartier populaire et artistique par excellence.",
  },
  {
    id: 'transept-sud-meridien',
    title: 'Transept Sud, Méridien & Vitraux du Chœur',
    shortTitle: 'Transept Sud & Méridien',
    era: 'XVIIe siècle • Philippe de Champaigne',
    location: 'Bras Sud du Transept • Côté Jardin Nelson-Mandela',
    markerPos: new THREE.Vector3(4.0, 4.2, 14.5),
    cameraPos: new THREE.Vector3(4.0, 4.8, 3.5),
    target: new THREE.Vector3(4.0, 14.2, 22.0),
    fpsPos: new THREE.Vector3(4.0, 2.15, 7.5),
    history:
      "Ouvert vers le Jardin Nelson-Mandela, le transept Sud impressionne par sa rosace flamboyante et son cadran solaire / méridien tourné vers le midi parisien. À l'Est, les verrières hautes du chœur, exécutées dès 1631 d'après les cartons de Philippe de Champaigne, baignent le sanctuaire d'une lumière polychrome éclatante.",
    anecdote:
      "Déplace le curseur solaire entre 12h00 et 15h00 dans le bandeau supérieur : tu verras la lumière méridienne frapper la façade Sud et les ombres portées balayer le parvis et le jardin des Halles !",
  },
];

export function buildSaintEustacheMonument(scene) {
  const built = buildSaintEustache(scene);

  // Lumières intérieures chaudes & illumination nocturne de Saint-Eustache
  const interiorLights = [];
  const lightSpecs = [
    { pos: [-34, 10.5, 0],     color: 0xffc87a, base: 18, night: 78, dist: 34 },
    { pos: [-18, 12.0, 0],     color: 0xffc472, base: 20, night: 85, dist: 36 },
    { pos: [4,   13.5, 0],     color: 0xffcb82, base: 22, night: 92, dist: 40 },
    { pos: [18,  8.5,  0],     color: 0xffd188, base: 26, night: 98, dist: 36 },
    { pos: [-35, 16.5, 0],     color: 0xffd79b, base: 20, night: 64, dist: 26 },
    { pos: [48.2, 6.4, 0],     color: 0xffe8c2, base: 34, night: 86, dist: 24 },
    { pos: [50.4, 4.4, 0],     color: 0xfff3db, base: 18, night: 42, dist: 12 },
    { pos: [31.5, 5.2, -10.5], color: 0xffcf87, base: 16, night: 52, dist: 18 },
    { pos: [-14.0, 5.0, -14.8], color: 0xffe2a8, base: 18, night: 48, dist: 14 },
    { pos: [4.0, 9.5, 14.5],   color: 0xffc97d, base: 14, night: 62, dist: 26 },
  ];

  lightSpecs.forEach((spec) => {
    const pt = new THREE.PointLight(spec.color, spec.base, spec.dist, 1.55);
    pt.position.set(...spec.pos);
    pt.castShadow = false;
    built.root.add(pt);
    interiorLights.push({ light: pt, base: spec.base, night: spec.night });
  });

  const facadeUplight = new THREE.PointLight(0xffbe6b, 0, 56, 1.4);
  facadeUplight.position.set(-56, 7.5, 0);
  built.root.add(facadeUplight);

  function getFloorHeightAt(x, z) {
    const inNave = x > -46.5 && x < 26.5 && Math.abs(z) < 19.2;
    const inTransept = x > -2.5 && x < 10.5 && Math.abs(z) < 22.8;
    const inApse = x >= 26.0 && Math.hypot(x - 26, z) < 19.2;
    const inLadyChapel = x >= 41.5 && x <= 57.0 && Math.abs(z) < 5.5;
    const inSanctuary = x >= 12.0 && x <= 25.0 && Math.abs(z) < 5.2;

    if (inSanctuary) return 0.85;
    if (inNave || inTransept || inApse || inLadyChapel) return 0.4;
    return 0.0;
  }

  let currentLod = 0;
  let currentCamDist = 90;

  function setLodLevel(level, camDist = 90) {
    currentLod = level;
    currentCamDist = camDist;
    built.root.visible = true;
    built.exteriorGroup.visible = true;
    built.envGroup.visible = true;
    built.interiorDetailGroup.visible = level === 0;
    if (built.envGroup.userData.microPropsGroup) {
      built.envGroup.userData.microPropsGroup.visible = level === 0;
    }
  }

  function update(dt, nightFactor, glassGlow, isActiveMonument) {
    // Active les lumières locales uniquement à proximité en coupant visible=false pour retirer ces lampes du shader PBR
    const useInteriorLights = (isActiveMonument || currentLod === 0) && currentCamDist < 135;
    interiorLights.forEach((entry) => {
      entry.light.visible = useInteriorLights;
      if (useInteriorLights) {
        entry.light.intensity = THREE.MathUtils.lerp(entry.base, entry.night, nightFactor);
      }
    });

    const useFacadeLight = currentLod <= 1 && currentCamDist < 240 && nightFactor > 0.08;
    facadeUplight.visible = useFacadeLight;
    if (useFacadeLight) {
      facadeUplight.intensity = nightFactor * 72;
    }

    built.stainedGlassMaterials.forEach((mat) => {
      mat.emissiveIntensity = glassGlow;
    });

    const lampGlow = 0.1 + nightFactor * 2.4;
    built.streetLampEmissives.forEach((mat) => {
      mat.emissiveIntensity = lampGlow;
    });
    void dt;
  }

  return {
    id: 'saint-eustache',
    name: 'Église Saint-Eustache',
    root: built.root,
    colliders: built.colliders,
    circleColliders: built.circleColliders,
    worldBounds: built.worldBounds,
    fpsSpawnPos: new THREE.Vector3(-59, 1.75, 0),
    fpsSpawnTarget: new THREE.Vector3(-30, 6.5, 0),
    getFloorHeightAt,
    setLodLevel,
    introChapter: SAINT_EUSTACHE_INTRO,
    pois: SAINT_EUSTACHE_POIS,
    update,
  };
}
