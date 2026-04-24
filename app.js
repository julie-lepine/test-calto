/**
 * Simulateur de primes rénovation énergétique (frontend pur)
 * ---------------------------------------------------------------------------
 * Ce fichier contient :
 * 1. Les barèmes de plafonds (Île-de-France / autres régions)
 * 2. Adresse / code postal → région ; autocomplétion Google (optionnelle)
 * 3. La fonction de catégorie de revenus
 * 4. Le calcul du montant d’aide selon les travaux
 * 5. L’animation de progression et l’affichage du résultat (sans rechargement)
 */

// ---------------------------------------------------------------------------
// 1. Données : plafonds annuels par taille de foyer (index 1 à 5)
//    Colonnes : très modestes, modestes, intermédiaires (supérieur = au-dessus)
// ---------------------------------------------------------------------------

const THRESHOLDS_IDF = {
  tresModeste: [0, 24031, 35270, 42357, 49455, 56580],
  modeste: [0, 29253, 42933, 51594, 60208, 68877],
  intermediaire: [0, 40851, 60051, 71846, 84562, 96817],
  /** Majoration par personne au-delà de 5 (même ordre de colonnes) */
  extra: { tresModeste: 7116, modeste: 8663, intermediaire: 12257 },
};

const THRESHOLDS_AUTRES = {
  tresModeste: [0, 17363, 25393, 30540, 35676, 40835],
  modeste: [0, 22259, 32553, 39148, 45735, 52348],
  intermediaire: [0, 31185, 45842, 55196, 64550, 73907],
  extra: { tresModeste: 5151, modeste: 6598, intermediaire: 9357 },
};

/** Libellés affichés pour la catégorie de revenus */
const CATEGORY_LABELS = {
  tres_modeste: "Revenus très modestes",
  modeste: "Revenus modestes",
  intermediaire: "Revenus intermédiaires",
  superieur: "Revenus supérieurs",
};

// ---------------------------------------------------------------------------
// 1b. Adresse / code postal → région (Île-de-France vs autres) + Google Places
// ---------------------------------------------------------------------------

/**
 * Clé API Google Maps (Places). Laisser vide pour désactiver l’autocomplétion.
 * Console : https://console.cloud.google.com/ — activer « Places API » et « Maps JavaScript API ».
 */
const GOOGLE_MAPS_API_KEY = "";

/** Départements d’Île-de-France : préfixes des codes postaux à 5 chiffres. */
const IDF_DEPARTMENTS_PREFIX = ["75", "77", "78", "91", "92", "93", "94", "95"];

function normalizePostalDigits(raw) {
  return String(raw ?? "").replace(/\D/g, "").slice(0, 5);
}

/**
 * @param {string} cp5 - exactement 5 chiffres
 * @returns {'idf'|'autres'|null}
 */
function deriveRegionFromPostalCode(cp5) {
  if (!/^\d{5}$/.test(cp5)) return null;
  const dept = cp5.slice(0, 2);
  return IDF_DEPARTMENTS_PREFIX.includes(dept) ? "idf" : "autres";
}

// ---------------------------------------------------------------------------
// 2. Catégorie de revenus : compare le RFR au plafond selon région et foyer
// ---------------------------------------------------------------------------

/**
 * Calcule la catégorie de revenus à partir du barème officiel simplifié.
 * @param {number} revenuFiscalRef - Revenu fiscal de référence annuel (€)
 * @param {number} nbPersonnes - Nombre de personnes du foyer (≥ 1)
 * @param {boolean} ileDeFrance - true si logement en Île-de-France
 * @returns {'tres_modeste'|'modeste'|'intermediaire'|'superieur'}
 */
function getCategorieRevenus(revenuFiscalRef, nbPersonnes, ileDeFrance) {
  const t = ileDeFrance ? THRESHOLDS_IDF : THRESHOLDS_AUTRES;
  const n = Math.max(1, Math.floor(Number(nbPersonnes)) || 1);

  let plafondTM;
  let plafondM;
  let plafondI;

  if (n <= 5) {
    plafondTM = t.tresModeste[n];
    plafondM = t.modeste[n];
    plafondI = t.intermediaire[n];
  } else {
    const sup = n - 5;
    plafondTM = t.tresModeste[5] + sup * t.extra.tresModeste;
    plafondM = t.modeste[5] + sup * t.extra.modeste;
    plafondI = t.intermediaire[5] + sup * t.extra.intermediaire;
  }

  if (revenuFiscalRef <= plafondTM) return "tres_modeste";
  if (revenuFiscalRef <= plafondM) return "modeste";
  if (revenuFiscalRef <= plafondI) return "intermediaire";
  return "superieur";
}

// ---------------------------------------------------------------------------
// 2.1 Zones Géo CEE
// ---------------------------------------------------------------------------

const zoneByDept = {
  // H1
  "01":"H1","02":"H1","03":"H1","05":"H1","08":"H1","10":"H1","14":"H1","15":"H1",
  "19":"H1","21":"H1","23":"H1","25":"H1","27":"H1","28":"H1","38":"H1","39":"H1",
  "42":"H1","43":"H1","45":"H1","51":"H1","52":"H1","54":"H1","55":"H1","57":"H1",
  "58":"H1","59":"H1","60":"H1","61":"H1","62":"H1","63":"H1","67":"H1","68":"H1",
  "69":"H1","70":"H1","71":"H1","73":"H1","74":"H1","75":"H1","76":"H1","77":"H1",
  "78":"H1","80":"H1","87":"H1","88":"H1","89":"H1","90":"H1","91":"H1","92":"H1",
  "93":"H1","94":"H1","95":"H1",

  // H2
  "04":"H2","07":"H2","09":"H2","12":"H2","16":"H2","17":"H2","18":"H2","22":"H2",
  "24":"H2","26":"H2","29":"H2","31":"H2","32":"H2","33":"H2","35":"H2","36":"H2",
  "37":"H2","40":"H2","41":"H2","44":"H2","46":"H2","47":"H2","48":"H2","49":"H2",
  "50":"H2","53":"H2","56":"H2","64":"H2","65":"H2","72":"H2","79":"H2","81":"H2",
  "82":"H2","84":"H2","85":"H2","86":"H2",

  // H3
  "06":"H3","11":"H3","13":"H3","20":"H3","30":"H3","34":"H3","66":"H3","83":"H3"
};

function getZoneCEE(postalCode) {
  if (!postalCode || typeof postalCode !== "string") {
    console.log("❌ Code postal invalide :", postalCode);
    return null;
  }

  const cleaned = postalCode.trim();
  const dept = cleaned.substring(0, 2);
  const zone = zoneByDept[dept] || null;

  console.log(`📍 Code postal: ${postalCode} → Département: ${dept} → Zone CEE: ${zone}`);

  return zone;
}

// ---------------------------------------------------------------------------
// 3. Montant d’aide estimé (barèmes forfaitaires ou au m²)
// ---------------------------------------------------------------------------

/**
 * Saisie selon le produit :
 * - Aucune (champ masqué + désactivé) : voir WORK_TYPES_FORFAIT_SANS_SAISIE.
 * - Surface (m²) : rampants, toitures-terrasses.
 * - Nombre : menuiseries.
 */
const WORK_TYPES_SURFACE_M2 = [
  "rampants",
  "toiture terrasses",
  "chaudieres biomasse",
  "combles perdus",
  "murs",
  "plancher",
  "pac air air",
  "vmc simple flux",
];
const WORK_TYPES_NOMBRE = ["menuiseries"];

/** Forfaits : pas de surface ni de nombre — l’input reste masqué. */
const WORK_TYPES_FORFAIT_SANS_SAISIE = [
  "chauffe eau thermo",
  "pac air eau",
  "pac geo",
  "chauffe eau solaire individuel",
  "chauffe eau solaire combiné",
  "poele buches",
  "poele granules",
  "foyer ferme",
  "cuve fioul",
  "double flux",
];

/** Libellé court affiché dans le détail des résultats (produit / projet). */
const WORK_TYPE_LABELS = {
  rampants: "Isolation des rampants de toiture",
  "toiture terrasses": "Isolation des toitures-terrasses",
  "chauffe eau thermo": "Chauffe-eau thermodynamique",
  "pac air eau": "Pompe à chaleur air / eau",
  "pac geo": "Pompe à chaleur géothermique ou sur capteurs solaires",
  "chauffe eau solaire individuel": "Chauffe-eau solaire individuel",
  "chauffe eau solaire combiné": "Chauffe-eau solaire combiné",
  "poele buches": "Poêle ou cuisinière à bûches",
  "poele granules": "Poêle ou cuisinière à granulés",
  "foyer ferme": "Foyer fermé ou insert",
  menuiseries: "Remplacement de fenêtres et porte-fenêtres",
  "cuve fioul": "Dépose de cuve à fioul",
  "double flux": "VMC double flux",
  "chaudieres biomasse": "Chaudière biomasse",
  "combles perdus": "Isolation des combles perdus",
  "murs": "Isolation des murs",
  plancher: "Isolation d'un plancher",
  "pac air air": "Pompe à chaleur air / air",
  "vmc simple flux": "VMC simple flux",
};

/** Âge minimum du logement (années) pour être pris en compte comme éligible MaPrimeRénov’ dans ce simulateur. */
const MAPRIME_AGE_MIN_LOGEMENT = 15;

/** Statuts pour lesquels aucune prime MaPrimeRénov’ n’est calculée. */
const MAPRIME_STATUTS_EXCLUS = {
  locataire: "Locataire : non éligible à MaPrimeRénov’.",
  residence_secondaire: "Propriétaire d’une résidence secondaire : non éligible à MaPrimeRénov’.",
  sci: "SCI / société : non éligible à MaPrimeRénov’.",
};

/**
 * @param {number} anneeConstruction
 * @returns {number} âge approximatif en années (année civile courante − année de construction)
 */
function getAgeLogementAnnees(anneeConstruction) {
  return new Date().getFullYear() - anneeConstruction;
}

/** @returns {'surface_m2'|'nombre'|null} */
function getWorkTypeSaisie(typeTravaux) {
  if (WORK_TYPES_SURFACE_M2.includes(typeTravaux)) return "surface_m2";
  if (WORK_TYPES_NOMBRE.includes(typeTravaux)) return "nombre";
  if (WORK_TYPES_FORFAIT_SANS_SAISIE.includes(typeTravaux)) return null;
  return null;
}

/**
 * @param {'tres_modeste'|'modeste'|'intermediaire'|'superieur'} categorie
 * @param {string} typeTravaux - valeur du select (identifiant métier)
 * @param {number} valeur - m² ou nombre d’ouvrants ; 0 si forfait sans saisie
 * @returns {{ montant: number, detail: string, eligible: boolean }}
 */
function calculerAideMPR(categorie, typeTravaux, valeur) {
  if (categorie === "superieur") {
    return {
      montant: 0,
      eligible: false,
      detail:
        "Avec des revenus supérieurs au plafond intermédiaire, vous n’êtes pas éligible dans ce scénario simplifié.",
    };
  }

  if (typeTravaux === "chauffe eau thermo") {
    const forfait = { tres_modeste: 1200, modeste: 800, intermediaire: 400 };
    return {
      montant: forfait[categorie],
      eligible: true,
      detail: "Chauffe-eau thermodynamique : aide forfaitaire selon votre tranche de revenus.",
    };
  }

  if (typeTravaux === "pac air eau") {
    const forfait = { tres_modeste: 5000, modeste: 4000, intermediaire: 3000 };
    return {
      montant: forfait[categorie],
      eligible: true,
      detail: "Pompe à chaleur air / eau : aide forfaitaire selon votre tranche de revenus.",
    };
  }

  if (typeTravaux === "pac geo") {
    const forfait = { tres_modeste: 11000, modeste: 9000, intermediaire: 6000 };
    return {
      montant: forfait[categorie],
      eligible: true,
      detail:
        "Pompe à chaleur géothermique ou solarothermique (dont PAC hybrides) : aide forfaitaire selon votre tranche de revenus.",
    };
  }

  if (typeTravaux === "chauffe eau solaire individuel") {
    const forfait = { tres_modeste: 4000, modeste: 3000, intermediaire: 2000 };
    return {
      montant: forfait[categorie],
      eligible: true,
      detail: "Chauffe-eau solaire individuel : aide forfaitaire selon votre tranche de revenus.",
    };
  }

  if (typeTravaux === "chauffe eau solaire combiné") {
    const forfait = { tres_modeste: 10000, modeste: 8000, intermediaire: 4000 };
    return {
      montant: forfait[categorie],
      eligible: true,
      detail: "Chauffe-eau solaire combiné : aide forfaitaire selon votre tranche de revenus.",
    };
  }

  if (typeTravaux === "poele buches") {
    const forfait = { tres_modeste: 1250, modeste: 1000, intermediaire: 500 };
    return {
      montant: forfait[categorie],
      eligible: true,
      detail: "Poêle à bûches et cuisinière à bûches : aide forfaitaire selon votre tranche de revenus.",
    };
  }

  if (typeTravaux === "poele granules") {
    const forfait = { tres_modeste: 1250, modeste: 1000, intermediaire: 750 };
    return {
      montant: forfait[categorie],
      eligible: true,
      detail: "Poêle à granulés et cuisinière à granulés : aide forfaitaire selon votre tranche de revenus.",
    };
  }

  if (typeTravaux === "foyer ferme") {
    const forfait = { tres_modeste: 1250, modeste: 750, intermediaire: 500 };
    return {
      montant: forfait[categorie],
      eligible: true,
      detail: "Foyer fermé et insert à bûches ou à granulés : aide forfaitaire selon votre tranche de revenus.",
    };
  }

  if (typeTravaux === "rampants") {
    const euroParM2 = { tres_modeste: 25, modeste: 20, intermediaire: 15 };
    const taux = euroParM2[categorie];
    const montant = Math.round(valeur * taux);
    return {
      montant,
      eligible: true,
      detail: `Isolation des rampants de toiture : ${taux} € / m² × ${valeur} m².`,
    };
  }

  if (typeTravaux === "toiture terrasses") {
    const euroParM2 = { tres_modeste: 75, modeste: 60, intermediaire: 40 };
    const taux = euroParM2[categorie];
    const montant = Math.round(valeur * taux);
    return {
      montant,
      eligible: true,
      detail: `Isolation des toitures-terrasses : ${taux} € / m² × ${valeur} m².`,
    };
  }

  if (typeTravaux === "menuiseries") {
    const forfait = { tres_modeste: 100, modeste: 80, intermediaire: 40 };
    const taux = forfait[categorie];
    const montant = Math.round(valeur * taux);
    return {
      montant,
      eligible: true,
      detail: `Remplacement de fenêtres et porte-fenêtres : ${taux} € × ${valeur} ouvrants.`,
    };
  }

  if (typeTravaux === "cuve fioul") {
    const forfait = { tres_modeste: 1200, modeste: 800, intermediaire: 400 };
    return {
      montant: forfait[categorie],
      eligible: true,
      detail: "Dépose de cuve à fioul : aide forfaitaire selon votre tranche de revenus.",
    };
  }

  if (typeTravaux === "double flux") {
    const forfait = { tres_modeste: 2500, modeste: 2000, intermediaire: 1500 };
    return {
      montant: forfait[categorie],
      eligible: true,
      detail: "VMC double flux : aide forfaitaire selon votre tranche de revenus.",
    };
  }

  return { montant: 0, eligible: false, detail: "Type de travaux non reconnu." };
}

/**
 * CEE Prime Calculator
 * Généré depuis cee_calculator_20251201.xlsx
 *
 * Formule générale :
 *   (geoZoneCorrectionFactor * surfaceARenoverCorrectiveFactor * nbKwhCumac * montantKwhCumac) / 1000
 *
 * Note tableur : dans ce barème, les montants CEE sont identiques pour toutes
 * les typologies de revenu (tres_modeste = modeste = intermediaire = superieur).
 * Le montant_TM présent dans le tableur (8.124797 pour fioul/gaz) n'est pas
 * appliqué dans les colonnes de calcul — on respecte les valeurs exactes du tableur.
 *
 * Dépend de la fonction externe déjà existante : getZoneCEE(postalCode) → "H1"|"H2"|"H3"
 *
 * @param {Object} params
 * @param {string}  params.postalCode       - Code postal du logement
 * @param {number}  params.revenuFiscalRef  - Revenu fiscal de référence (foyer)
 * @param {number}  params.nbPersonnes      - Nombre de personnes dans le foyer
 * @param {string}  params.housingType      - "maison" | "appartement"
 * @param {string}  params.heatingBefore    - "bois" | "electricite" | "fioul" | "gaz"
 * @param {number}  [params.surface_m2]     - Surface habitable (double flux uniquement)
 * @param {number}  [params.valeur]         - Quantité / m² (menuiseries, rampants, toiture terrasses)
 * @returns {{ [travaux: string]: number }}  Prime en € pour la catégorie de revenu du foyer
 */

// ---------------------------------------------------------------------------
// Plafonds de ressources 2025 (source ANAH)
// Clé = nb de personnes, valeur = { tm, m, i }  (superieur = au-delà de i)
// ---------------------------------------------------------------------------
const PLAFONDS = {
  1:     { tm: 17009, m: 21805, i: 30549 },
  2:     { tm: 24875, m: 31903, i: 44907 },
  3:     { tm: 29917, m: 38349, i: 54071 },
  4:     { tm: 34948, m: 44787, i: 63235 },
  5:     { tm: 40002, m: 51281, i: 72400 },
  extra: { tm:  5028, m:  6496, i:  9165 }, // par personne supplémentaire au-delà de 5
};

/**
 * Détermine la catégorie de revenu du foyer.
 * @param {number} revenuFiscalRef
 * @param {number} nbPersonnes
 * @returns {"tres_modeste"|"modeste"|"intermediaire"|"superieur"}
 */
function getTypologieClient(revenuFiscalRef, nbPersonnes) {
  const n        = Math.max(1, Math.min(nbPersonnes, 5));
  const base     = PLAFONDS[n];
  const sup      = nbPersonnes > 5 ? (nbPersonnes - 5) : 0;

  const plafondTM = base.tm + sup * PLAFONDS.extra.tm;
  const plafondM  = base.m  + sup * PLAFONDS.extra.m;
  const plafondI  = base.i  + sup * PLAFONDS.extra.i;

  if (revenuFiscalRef <= plafondTM) return "tres_modeste";
  if (revenuFiscalRef <= plafondM)  return "modeste";
  if (revenuFiscalRef <= plafondI)  return "intermediaire";
  return "superieur";
}

// ---------------------------------------------------------------------------
// Table des primes CEE (valeurs extraites du tableur Excel)
//
// Structure de chaque entrée :
//   c           : nom du travail (construction)
//   geo         : zone climatique "H1" | "H2" | "H3"   (undefined si non pertinent)
//   housing     : "maison" | "appartement"              (undefined si non pertinent)
//   heating     : énergie chauffage avant travaux        (undefined si non pertinent)
//   surfaceSlot : plage de surface pour double flux      (undefined si non pertinent)
//   gcf         : geoZoneCorrectionFactor
//   scf         : surfaceARenoverCorrectiveFactor
//   kwh         : nbKwhCumac  (même valeur pour tm/m/i/s dans ce barème)
//   mkwh        : montantKwhCumac par m²/unité (valeurs du tableur)
//
// Formule : (gcf * scf * kwh * mkwh) / 1000
// ---------------------------------------------------------------------------
const CEE_DATA = [

  // ── chauffe eau solaire combiné ──────────────────────────────────────────
  // Variables : geoZone (col C) + heatingBefore (col F)
  { c: "chauffe eau solaire combiné", geo: "H1", heating: "fioul",       gcf: 1, scf: 1, kwh: 769200, mkwh: 7.280291 },
  { c: "chauffe eau solaire combiné", geo: "H1", heating: "gaz",         gcf: 1, scf: 1, kwh: 769200, mkwh: 7.280291 },
  { c: "chauffe eau solaire combiné", geo: "H1", heating: "bois",        gcf: 1, scf: 1, kwh: 134800, mkwh: 5.4      },
  { c: "chauffe eau solaire combiné", geo: "H1", heating: "electricite", gcf: 1, scf: 1, kwh: 134800, mkwh: 5.4      },
  { c: "chauffe eau solaire combiné", geo: "H2", heating: "fioul",       gcf: 1, scf: 1, kwh: 769200, mkwh: 7.280291 },
  { c: "chauffe eau solaire combiné", geo: "H2", heating: "gaz",         gcf: 1, scf: 1, kwh: 769200, mkwh: 7.280291 },
  { c: "chauffe eau solaire combiné", geo: "H2", heating: "bois",        gcf: 1, scf: 1, kwh: 121000, mkwh: 5.4      },
  { c: "chauffe eau solaire combiné", geo: "H2", heating: "electricite", gcf: 1, scf: 1, kwh: 121000, mkwh: 5.4      },
  { c: "chauffe eau solaire combiné", geo: "H3", heating: "fioul",       gcf: 1, scf: 1, kwh: 769200, mkwh: 7.280291 },
  { c: "chauffe eau solaire combiné", geo: "H3", heating: "gaz",         gcf: 1, scf: 1, kwh: 769200, mkwh: 7.280291 },
  { c: "chauffe eau solaire combiné", geo: "H3", heating: "bois",        gcf: 1, scf: 1, kwh: 100500, mkwh: 5.4      },
  { c: "chauffe eau solaire combiné", geo: "H3", heating: "electricite", gcf: 1, scf: 1, kwh: 100500, mkwh: 5.4      },

  // ── chauffe eau solaire individuel ───────────────────────────────────────
  // Variable : geoZone (col C)
  { c: "chauffe eau solaire individuel", geo: "H1", gcf: 1, scf: 1, kwh: 18500, mkwh: 5.4 },
  { c: "chauffe eau solaire individuel", geo: "H2", gcf: 1, scf: 1, kwh: 21000, mkwh: 5.4 },
  { c: "chauffe eau solaire individuel", geo: "H3", gcf: 1, scf: 1, kwh: 24200, mkwh: 5.4 },

  // ── chauffe eau thermo ───────────────────────────────────────────────────
  // Variable : housingType (col B)
  { c: "chauffe eau thermo", housing: "maison",      gcf: 1, scf: 1, kwh: 14700, mkwh: 5.4 },
  { c: "chauffe eau thermo", housing: "appartement", gcf: 1, scf: 1, kwh: 11800, mkwh: 5.4 },

  // ── double flux ──────────────────────────────────────────────────────────
  // Variables : geoZone (col C) + surface_m2 (col G) → surfaceSlot → scf
  { c: "double flux", geo: "H1", surfaceSlot: "S < 35",        gcf: 1, scf: 0.3, kwh: 39700, mkwh: 5.4 },
  { c: "double flux", geo: "H2", surfaceSlot: "S < 35",        gcf: 1, scf: 0.3, kwh: 32500, mkwh: 5.4 },
  { c: "double flux", geo: "H3", surfaceSlot: "S < 35",        gcf: 1, scf: 0.3, kwh: 21600, mkwh: 5.4 },
  { c: "double flux", geo: "H1", surfaceSlot: "35 ≤ S < 60",   gcf: 1, scf: 0.5, kwh: 39700, mkwh: 5.4 },
  { c: "double flux", geo: "H2", surfaceSlot: "35 ≤ S < 60",   gcf: 1, scf: 0.5, kwh: 32500, mkwh: 5.4 },
  { c: "double flux", geo: "H3", surfaceSlot: "35 ≤ S < 60",   gcf: 1, scf: 0.5, kwh: 21600, mkwh: 5.4 },
  { c: "double flux", geo: "H1", surfaceSlot: "60 ≤ S < 70",   gcf: 1, scf: 0.6, kwh: 39700, mkwh: 5.4 },
  { c: "double flux", geo: "H2", surfaceSlot: "60 ≤ S < 70",   gcf: 1, scf: 0.6, kwh: 32500, mkwh: 5.4 },
  { c: "double flux", geo: "H3", surfaceSlot: "60 ≤ S < 70",   gcf: 1, scf: 0.6, kwh: 21600, mkwh: 5.4 },
  { c: "double flux", geo: "H1", surfaceSlot: "70 ≤ S < 90",   gcf: 1, scf: 0.7, kwh: 39700, mkwh: 5.4 },
  { c: "double flux", geo: "H2", surfaceSlot: "70 ≤ S < 90",   gcf: 1, scf: 0.7, kwh: 32500, mkwh: 5.4 },
  { c: "double flux", geo: "H3", surfaceSlot: "70 ≤ S < 90",   gcf: 1, scf: 0.7, kwh: 21600, mkwh: 5.4 },
  { c: "double flux", geo: "H1", surfaceSlot: "90 ≤ S < 110",  gcf: 1, scf: 1.0, kwh: 39700, mkwh: 5.4 },
  { c: "double flux", geo: "H2", surfaceSlot: "90 ≤ S < 110",  gcf: 1, scf: 1.0, kwh: 32500, mkwh: 5.4 },
  { c: "double flux", geo: "H3", surfaceSlot: "90 ≤ S < 110",  gcf: 1, scf: 1.0, kwh: 21600, mkwh: 5.4 },
  { c: "double flux", geo: "H1", surfaceSlot: "110 ≤ S ≤ 130", gcf: 1, scf: 1.1, kwh: 39700, mkwh: 5.4 },
  { c: "double flux", geo: "H2", surfaceSlot: "110 ≤ S ≤ 130", gcf: 1, scf: 1.1, kwh: 32500, mkwh: 5.4 },
  { c: "double flux", geo: "H3", surfaceSlot: "110 ≤ S ≤ 130", gcf: 1, scf: 1.1, kwh: 21600, mkwh: 5.4 },
  { c: "double flux", geo: "H1", surfaceSlot: "130 < S",        gcf: 1, scf: 1.6, kwh: 39700, mkwh: 5.4 },
  { c: "double flux", geo: "H2", surfaceSlot: "130 < S",        gcf: 1, scf: 1.6, kwh: 32500, mkwh: 5.4 },
  { c: "double flux", geo: "H3", surfaceSlot: "130 < S",        gcf: 1, scf: 1.6, kwh: 21600, mkwh: 5.4 },

  // ── menuiseries ──────────────────────────────────────────────────────────
  // Variable : geoZone (col C) — résultat × valeur (nb d'unités)
  { c: "menuiseries", geo: "H1", gcf: 1, scf: 1, kwh: 3800, mkwh: 5.4 },
  { c: "menuiseries", geo: "H2", gcf: 1, scf: 1, kwh: 3100, mkwh: 5.4 },
  { c: "menuiseries", geo: "H3", gcf: 1, scf: 1, kwh: 2100, mkwh: 5.4 },

  // ── rampants ─────────────────────────────────────────────────────────────
  // Variable : geoZone (col C) — résultat × valeur (surface m²)
  { c: "rampants", geo: "H1", gcf: 1, scf: 1, kwh: 1700, mkwh: 5.4 },
  { c: "rampants", geo: "H2", gcf: 1, scf: 1, kwh: 1400, mkwh: 5.4 },
  { c: "rampants", geo: "H3", gcf: 1, scf: 1, kwh:  920, mkwh: 5.4 },

  // ── toiture terrasses ────────────────────────────────────────────────────
  // Variable : geoZone (col C) — résultat × valeur (surface m²)
  { c: "toiture terrasses", geo: "H1", gcf: 1, scf: 1, kwh: 1200, mkwh: 5.4 },
  { c: "toiture terrasses", geo: "H2", gcf: 1, scf: 1, kwh: 1000, mkwh: 5.4 },
  { c: "toiture terrasses", geo: "H3", gcf: 1, scf: 1, kwh:  670, mkwh: 5.4 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Retourne le surfaceSlot correspondant à la surface réelle pour double flux.
 * @param {number} surface_m2
 * @returns {string}
 */
function getSurfaceSlotDoubleFlux(surface_m2) {
  const s = Number(surface_m2);
  if (s < 35)   return "S < 35";
  if (s < 60)   return "35 ≤ S < 60";
  if (s < 70)   return "60 ≤ S < 70";
  if (s < 90)   return "70 ≤ S < 90";
  if (s < 110)  return "90 ≤ S < 110";
  if (s <= 130) return "110 ≤ S ≤ 130";
  return "130 < S";
}

/**
 * Applique la formule : (gcf * scf * kwh * mkwh) / 1000
 * @param {{ gcf: number, scf: number, kwh: number, mkwh: number }} row
 * @returns {number}
 */
function applyFormula(row) {
  return (row.gcf * row.scf * row.kwh * row.mkwh) / 1000;
}

// ---------------------------------------------------------------------------
// Fonction principale — prime pour UNE catégorie de revenu
// ---------------------------------------------------------------------------

/**
 * Calcule les primes CEE pour tous les types de travaux applicables.
 *
 * @param {Object} params
 * @param {string}  params.postalCode       Code postal du logement
 * @param {number}  params.revenuFiscalRef  Revenu fiscal de référence
 * @param {number}  params.nbPersonnes      Nb de personnes dans le foyer
 * @param {string}  params.housingType      "maison" | "appartement"
 * @param {string}  params.heatingBefore    "bois" | "electricite" | "fioul" | "gaz"
 * @param {number}  [params.surface_m2]     Surface habitable (double flux uniquement)
 * @param {number}  [params.valeur=1]       Multiplicateur (menuiseries / rampants / toiture terrasses)
 * @returns {{ [travaux: string]: number }}
 */
function calculateCEEPrimes({
  postalCode,
  revenuFiscalRef,
  nbPersonnes,
  housingType,
  heatingBefore,
  surface_m2,
  valeur = 1,
}) {
  // Zone geo via la fonction déjà présente dans l'app
  const geoZone  = getZoneCEE(postalCode);       // "H1" | "H2" | "H3"
  // Typologie : déterminée mais les primes CEE sont identiques quelle que soit la catégorie
  // (valeur conservée pour compatibilité future / évolution barème)
  const typologie = getTypologieClient(revenuFiscalRef, nbPersonnes); // eslint-disable-line no-unused-vars

  const housing  = (housingType   || "").toLowerCase();
  const heating  = (heatingBefore || "").toLowerCase();
  const result   = {};

  // ── chauffe eau solaire combiné ──────────────────────────────────────────
  const cescRow = CEE_DATA.find(r =>
    r.c === "chauffe eau solaire combiné" &&
    r.geo === geoZone &&
    r.heating === heating
  );
  if (cescRow) {
    result["chauffe eau solaire combiné"] = applyFormula(cescRow);
  }

  // ── chauffe eau solaire individuel ───────────────────────────────────────
  const cesiRow = CEE_DATA.find(r =>
    r.c === "chauffe eau solaire individuel" &&
    r.geo === geoZone
  );
  if (cesiRow) {
    result["chauffe eau solaire individuel"] = applyFormula(cesiRow);
  }

  // ── chauffe eau thermo ───────────────────────────────────────────────────
  const cetRow = CEE_DATA.find(r =>
    r.c === "chauffe eau thermo" &&
    r.housing === housing
  );
  if (cetRow) {
    result["chauffe eau thermo"] = applyFormula(cetRow);
  }

  // ── double flux ──────────────────────────────────────────────────────────
  if (surface_m2 !== undefined && surface_m2 !== null) {
    const slot  = getSurfaceSlotDoubleFlux(surface_m2);
    const dfRow = CEE_DATA.find(r =>
      r.c === "double flux" &&
      r.geo === geoZone &&
      r.surfaceSlot === slot
    );
    if (dfRow) {
      result["double flux"] = applyFormula(dfRow);
    }
  }

  // ── menuiseries — × valeur (nb d'unités) ─────────────────────────────────
  const menuRow = CEE_DATA.find(r =>
    r.c === "menuiseries" && r.geo === geoZone
  );
  if (menuRow) {
    result["menuiseries"] = applyFormula(menuRow) * valeur;
  }

  // ── rampants — × valeur (m²) ─────────────────────────────────────────────
  const rampRow = CEE_DATA.find(r =>
    r.c === "rampants" && r.geo === geoZone
  );
  if (rampRow) {
    result["rampants"] = applyFormula(rampRow) * valeur;
  }

  // ── toiture terrasses — × valeur (m²) ────────────────────────────────────
  const ttRow = CEE_DATA.find(r =>
    r.c === "toiture terrasses" && r.geo === geoZone
  );
  if (ttRow) {
    result["toiture terrasses"] = applyFormula(ttRow) * valeur;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Variante pratique : retourne les primes par travail, sans revenu requis
// (les 4 typologies donnent la même valeur dans ce barème)
// ---------------------------------------------------------------------------

/**
 * Calcule la prime CEE unitaire pour un type de travail donné.
 * Ne nécessite pas le revenu fiscal (identique pour toutes typologies).
 *
 * @param {string}  travail       Nom du travail (clé de CEE_DATA)
 * @param {string}  postalCode    Code postal
 * @param {string}  housingType   "maison" | "appartement"
 * @param {string}  heatingBefore "bois" | "electricite" | "fioul" | "gaz"
 * @param {number}  [surface_m2]  Surface habitable (double flux)
 * @param {number}  [valeur=1]    Multiplicateur (menuiseries / rampants / toiture)
 * @returns {number|null}
 */
function calculateCEEPrime(travail, { postalCode, housingType, heatingBefore, surface_m2, valeur = 1 }) {
  const geoZone = getZoneCEE(postalCode);
  const housing = (housingType   || "").toLowerCase();
  const heating = (heatingBefore || "").toLowerCase();

  let row;

  switch (travail) {
    case "chauffe eau solaire combiné":
      row = CEE_DATA.find(r => r.c === travail && r.geo === geoZone && r.heating === heating);
      return row ? applyFormula(row) : null;

    case "chauffe eau solaire individuel":
      row = CEE_DATA.find(r => r.c === travail && r.geo === geoZone);
      return row ? applyFormula(row) : null;

    case "chauffe eau thermo":
      row = CEE_DATA.find(r => r.c === travail && r.housing === housing);
      return row ? applyFormula(row) : null;

    case "double flux": {
      if (surface_m2 === undefined || surface_m2 === null) return null;
      const slot = getSurfaceSlotDoubleFlux(surface_m2);
      row = CEE_DATA.find(r => r.c === travail && r.geo === geoZone && r.surfaceSlot === slot);
      return row ? applyFormula(row) : null;
    }

    case "menuiseries":
    case "rampants":
    case "toiture terrasses":
      row = CEE_DATA.find(r => r.c === travail && r.geo === geoZone);
      return row ? applyFormula(row) * valeur : null;

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Export (Node.js / bundler)
// ---------------------------------------------------------------------------
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    calculateCEEPrimes,
    calculateCEEPrime,
    getTypologieClient,
    getSurfaceSlotDoubleFlux,
    CEE_DATA,
    PLAFONDS,
  };
}

// ---------------------------------------------------------------------------
// 4. Interface : formulaire, progression, résultat
// ---------------------------------------------------------------------------

const form = document.getElementById("simulation-form");
const projectsContainer = document.getElementById("projects-container");
const workTypeMaster = document.getElementById("work-type-master");
const addProjectBtn = document.getElementById("add-project-btn");
const progressEl = document.getElementById("progress");
const progressBar = document.getElementById("progress-bar");
const submitBtn = document.getElementById("submit-btn");
const resultPanel = document.getElementById("result-panel");
const resultCategory = document.getElementById("result-category");
const resultAmount = document.getElementById("result-amount");
const resultCEEAmount = document.getElementById("result-cee-amount");
const resultBlocage = document.getElementById("result-blocage");
const resultSituation = document.getElementById("result-situation");
const resultBreakdown = document.getElementById("result-breakdown");
const resultBreakdownCEE = document.getElementById("result-breakdown-cee");
const addressInput = document.getElementById("address");
const cityInput = document.getElementById("city");
const postalInput = document.getElementById("postalCode");
const regionInput = document.getElementById("region");
const addressHint = document.getElementById("address-hint");

/** Ordre de focus en cas d’erreurs multiples (messages sous chaque champ). */
const ERROR_FIELD_IDS = [
  "housingType",
  "status",
  "constructionYear",
  "surfaceARenover",
  "address",
  "city",
  "postalCode",
  "income",
  "household",
  "heatingBefore",
];

function clearFieldErrors() {
  ERROR_FIELD_IDS.forEach(function (id) {
    const err = document.getElementById("err-" + id);
    if (err) {
      err.textContent = "";
      err.hidden = true;
    }
    const el = document.getElementById(id);
    if (el) el.removeAttribute("aria-invalid");
  });
  const ep = document.getElementById("err-projects");
  if (ep) {
    ep.textContent = "";
    ep.hidden = true;
  }
  projectsContainer.querySelectorAll(".project-row").forEach(function (row) {
    clearRowProjectError(row, "workType");
    clearRowProjectError(row, "quantity");
  });
}

function showFieldError(fieldId, message) {
  const err = document.getElementById("err-" + fieldId);
  if (err) {
    err.textContent = message;
    err.hidden = false;
  }
  const el = document.getElementById(fieldId);
  if (el) el.setAttribute("aria-invalid", "true");
}

function clearRowProjectError(row, field) {
  const sel = field === "workType" ? ".project-err-workType" : ".project-err-quantity";
  const err = row.querySelector(sel);
  if (err) {
    err.textContent = "";
    err.hidden = true;
  }
  const input =
    field === "workType" ? row.querySelector(".project-work-type") : row.querySelector(".project-quantity");
  if (input) input.removeAttribute("aria-invalid");
}

function showProjectRowError(row, field, message) {
  const sel = field === "workType" ? ".project-err-workType" : ".project-err-quantity";
  const err = row.querySelector(sel);
  if (err) {
    err.textContent = message;
    err.hidden = false;
  }
  const input =
    field === "workType" ? row.querySelector(".project-work-type") : row.querySelector(".project-quantity");
  if (input) input.setAttribute("aria-invalid", "true");
}

function showProjectsBlockError(message) {
  const el = document.getElementById("err-projects");
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
}

function focusFirstInvalidField() {
  const formEl = document.getElementById("simulation-form");
  const errors = formEl.querySelectorAll(".field__error:not([hidden])");
  if (!errors.length) return;
  const err = errors[0];
  if (err.id === "err-projects") {
    addProjectBtn.focus({ preventScroll: true });
    err.scrollIntoView({ behavior: "smooth", block: "nearest" });
    return;
  }
  const row = err.closest(".project-row");
  if (row) {
    if (err.classList.contains("project-err-workType")) {
      row.querySelector(".project-work-type")?.focus({ preventScroll: true });
    } else {
      row.querySelector(".project-quantity")?.focus({ preventScroll: true });
    }
    err.scrollIntoView({ behavior: "smooth", block: "nearest" });
    return;
  }
  const id = err.id.replace(/^err-/, "");
  const input = document.getElementById(id);
  if (input && !input.disabled) {
    input.focus({ preventScroll: true });
    input.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function bindClearErrorOnInput(fieldId) {
  const el = document.getElementById(fieldId);
  if (!el) return;
  const evt = el.tagName === "SELECT" ? "change" : "input";
  el.addEventListener(evt, function () {
    const err = document.getElementById("err-" + fieldId);
    if (err && !err.hidden) {
      err.textContent = "";
      err.hidden = true;
      el.removeAttribute("aria-invalid");
    }
  });
}

ERROR_FIELD_IDS.forEach(bindClearErrorOnInput);

projectsContainer.addEventListener("input", function (e) {
  const t = e.target;
  if (!t.classList.contains("project-quantity")) return;
  const row = t.closest(".project-row");
  if (row) clearRowProjectError(row, "quantity");
});

projectsContainer.addEventListener("change", function (e) {
  const t = e.target;
  if (!t.classList.contains("project-work-type")) return;
  const row = t.closest(".project-row");
  if (row) clearRowProjectError(row, "workType");
});

function updateQuantityForRow(row) {
  const workSel = row.querySelector(".project-work-type");
  const workValue = workSel.value;
  const kind = getWorkTypeSaisie(workValue);
  const wrap = row.querySelector(".project-quantity-wrap");
  const qtyInput = row.querySelector(".project-quantity");
  const qtyLabel = row.querySelector(".project-quantity-label");
  const qtyHint = row.querySelector(".project-quantity-hint");
  const hasWorkType = Boolean(workValue);
  const isForfaitSansSaisie = kind === null;

  if (!hasWorkType) {
    wrap.hidden = true;
    wrap.setAttribute("aria-hidden", "true");
    qtyInput.required = false;
    qtyInput.disabled = true;
    qtyInput.hidden = false;
    qtyInput.value = "";
    qtyHint.textContent = "";
    qtyLabel.textContent = "—";
    clearRowProjectError(row, "quantity");
    qtyInput.removeAttribute("aria-invalid");
    return;
  }

  wrap.hidden = false;
  wrap.setAttribute("aria-hidden", "false");

  qtyInput.required = !isForfaitSansSaisie;
  qtyInput.disabled = isForfaitSansSaisie;
  qtyInput.hidden = isForfaitSansSaisie;

  if (isForfaitSansSaisie) {
    qtyLabel.textContent = "Forfait";
    qtyHint.textContent = "Montant forfaitaire (pas de saisie nécessaire).";
    qtyInput.value = "";
    clearRowProjectError(row, "quantity");
    qtyInput.removeAttribute("aria-invalid");
    return;
  }

  qtyInput.min = "1";
  qtyInput.step = "1";
  if (kind === "surface_m2") {
    qtyLabel.textContent = "Surface (m²)";
    qtyHint.textContent = "";
    qtyInput.placeholder = "Ex. 95";
  } else {
    qtyLabel.textContent = "Nombre";
    qtyHint.textContent = "Nombre de fenêtres et porte-fenêtres remplacées.";
    qtyInput.placeholder = "Ex. 8";
  }
}

function updateProjectChrome() {
  const rows = projectsContainer.querySelectorAll(".project-row");
  const multi = rows.length > 1;
  rows.forEach(function (r, i) {
    const num = r.querySelector(".project-row__num");
    if (num) num.textContent = String(i + 1);
    const btn = r.querySelector(".project-row__remove");
    if (btn) {
      btn.hidden = !multi;
      btn.disabled = !multi;
    }
  });
}

function createProjectRow() {
  const row = document.createElement("div");
  row.className = "project-row";

  const head = document.createElement("div");
  head.className = "project-row__head";
  const title = document.createElement("span");
  title.className = "project-row__title";
  title.innerHTML = 'Projet <span class="project-row__num">1</span>';
  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "btn btn--ghost project-row__remove";
  removeBtn.textContent = "Supprimer";
  removeBtn.setAttribute("aria-label", "Supprimer ce projet");
  removeBtn.addEventListener("click", function () {
    if (projectsContainer.children.length <= 1) return;
    row.remove();
    updateProjectChrome();
  });
  head.appendChild(title);
  head.appendChild(removeBtn);

  const workLabel = document.createElement("label");
  workLabel.className = "field field--full";
  const workLabelText = document.createElement("span");
  workLabelText.className = "field__label";
  workLabelText.textContent = "Type de travaux";
  const workSel = workTypeMaster.cloneNode(true);
  workSel.disabled = false;
  workSel.hidden = false;
  workSel.removeAttribute("id");
  workSel.removeAttribute("aria-hidden");
  workSel.removeAttribute("tabindex");
  workSel.name = "workType[]";
  workSel.className = "project-work-type";
  workSel.required = true;
  workSel.value = "";
  const errWork = document.createElement("span");
  errWork.className = "field__error project-err-workType";
  errWork.hidden = true;
  workLabel.appendChild(workLabelText);
  workLabel.appendChild(workSel);
  workLabel.appendChild(errWork);

  const qtyWrap = document.createElement("label");
  qtyWrap.className = "field field--full project-quantity-wrap";
  qtyWrap.hidden = true;
  const qtyLab = document.createElement("span");
  qtyLab.className = "field__label project-quantity-label";
  qtyLab.textContent = "—";
  const qtyInput = document.createElement("input");
  qtyInput.type = "number";
  qtyInput.className = "project-quantity";
  qtyInput.min = "1";
  qtyInput.step = "1";
  qtyInput.disabled = true;
  const errQty = document.createElement("span");
  errQty.className = "field__error project-err-quantity";
  errQty.hidden = true;
  const qtyHint = document.createElement("span");
  qtyHint.className = "field__hint project-quantity-hint";
  qtyWrap.appendChild(qtyLab);
  qtyWrap.appendChild(qtyInput);
  qtyWrap.appendChild(errQty);
  qtyWrap.appendChild(qtyHint);

  workSel.addEventListener("change", function () {
    updateQuantityForRow(row);
  });

  row.appendChild(head);
  row.appendChild(workLabel);
  row.appendChild(qtyWrap);

  return row;
}

function addProjectRow() {
  const row = createProjectRow();
  projectsContainer.appendChild(row);
  updateQuantityForRow(row);
  updateProjectChrome();
}

addProjectBtn.addEventListener("click", addProjectRow);
addProjectRow();

/** Met à jour le champ caché « region » à partir du code postal (affichage région retiré du formulaire). */
function syncRegionFromPostal() {
  const cp = normalizePostalDigits(postalInput.value);
  postalInput.value = cp;
  const r = deriveRegionFromPostalCode(cp);
  regionInput.value = r || "";
}

postalInput.addEventListener("input", syncRegionFromPostal);
postalInput.addEventListener("blur", syncRegionFromPostal);

function setAddressHint(text) {
  addressHint.textContent = text;
}

function initPlacesAutocomplete() {
  const g = window.google;
  if (!g || !g.maps || !g.maps.places) return;
  const autocomplete = new g.maps.places.Autocomplete(addressInput, {
    componentRestrictions: { country: "fr" },
    fields: ["address_components", "formatted_address"],
    types: ["address"],
  });
  autocomplete.addListener("place_changed", function () {
    const place = autocomplete.getPlace();
    if (!place.address_components) return;
    let streetNum = "";
    let route = "";
    let locality = "";
    let postal = "";
    for (let i = 0; i < place.address_components.length; i += 1) {
      const c = place.address_components[i];
      const t = c.types;
      if (t.includes("street_number")) streetNum = c.long_name;
      if (t.includes("route")) route = c.long_name;
      if (t.includes("locality")) locality = c.long_name;
      if (t.includes("postal_town") && !locality) locality = c.long_name;
      if (t.includes("postal_code")) postal = c.long_name;
    }
    const line = [streetNum, route].filter(Boolean).join(" ").trim();
    if (line) {
      addressInput.value = line;
    } else if (place.formatted_address) {
      const first = place.formatted_address.split(",")[0];
      addressInput.value = first ? first.trim() : place.formatted_address;
    }
    if (locality) {
      cityInput.value = locality;
    }
    const digits = normalizePostalDigits(postal);
    if (digits.length === 5) {
      postalInput.value = digits;
      syncRegionFromPostal();
    }
    clearFieldErrors();
  });
  setAddressHint(
    "Suggestions d’adresses activées (France). Ville et code postal sont complétés lorsque Google les fournit."
  );
}

/** Callback global pour le chargement async de l’API Google Maps. */
window.initSimulateurPlaces = function () {
  try {
    initPlacesAutocomplete();
  } catch (e) {
    setAddressHint(
      "Autocomplétion indisponible : saisissez l’adresse et un code postal à 5 chiffres."
    );
  }
  delete window.initSimulateurPlaces;
};

function loadGooglePlacesScript() {
  if (!GOOGLE_MAPS_API_KEY) {
    setAddressHint(
      "Autocomplétion non configurée : ajoutez votre clé dans GOOGLE_MAPS_API_KEY (app.js), ou saisissez l’adresse et un code postal à 5 chiffres."
    );
    return;
  }
  const script = document.createElement("script");
  script.src =
    "https://maps.googleapis.com/maps/api/js?key=" +
    encodeURIComponent(GOOGLE_MAPS_API_KEY) +
    "&libraries=places&language=fr&callback=initSimulateurPlaces";
  script.async = true;
  script.defer = true;
  script.onerror = function () {
    setAddressHint(
      "Impossible de charger l’API Google. Vérifiez la clé réseau et saisissez un code postal à 5 chiffres."
    );
  };
  document.head.appendChild(script);
}

loadGooglePlacesScript();
syncRegionFromPostal();

(function setConstructionYearMax() {
  const y = document.getElementById("constructionYear");
  if (y) y.setAttribute("max", String(new Date().getFullYear()));
})();

/**
 * Animation courte de la barre de progression (effet “calcul en cours”).
 * @param {() => void} onComplete - appelé une fois la barre à 100 %
 */
function runProgressAnimation(onComplete) {
  progressEl.hidden = false;
  progressEl.setAttribute("aria-hidden", "false");
  progressBar.style.width = "0%";
  submitBtn.disabled = true;

  const steps = [15, 40, 72, 100];
  let i = 0;

  function tick() {
    if (i >= steps.length) {
      onComplete();
      return;
    }
    progressBar.style.width = `${steps[i]}%`;
    i += 1;
    window.setTimeout(tick, 180);
  }

  window.requestAnimationFrame(() => window.setTimeout(tick, 50));
}

function formatEuros(n) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatSurfaceM2(n) {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

/**
 * Affiche le détail des primes par produit / projet.
 * @param {{ workType: string, valeur: number }[]} projets
 * @param {'tres_modeste'|'modeste'|'intermediaire'|'superieur'} categorie
 * @param {{ maprimeBloquee: boolean }} opts
 */
function renderResultBreakdown(projets, categorie, opts) {
  const maprimeBloquee = opts.maprimeBloquee;
  resultBreakdown.textContent = "";

  projets.forEach(function (p, index) {
    const aide = calculerAideMPR(categorie, p.workType, p.valeur);
    const nomProduit = WORK_TYPE_LABELS[p.workType] || p.workType;

    const article = document.createElement("article");
    article.className = "result-product";

    const row = document.createElement("div");
    row.className = "result-product__row";

    const nameEl = document.createElement("span");
    nameEl.className = "result-product__name";
    nameEl.textContent = "Projet " + (index + 1) + " — " + nomProduit;

    const amtEl = document.createElement("span");
    amtEl.className = "result-product__amount";
    if (maprimeBloquee) {
      amtEl.classList.add("result-product__amount--zero");
      amtEl.textContent = "0 €";
    } else if (!aide.eligible) {
      amtEl.classList.add("result-product__amount--zero");
      amtEl.textContent = "Non éligible";
    } else {
      amtEl.textContent = formatEuros(aide.montant);
    }

    row.appendChild(nameEl);
    row.appendChild(amtEl);
    article.appendChild(row);

    const det = document.createElement("p");
    det.className = "result-product__detail";
    let txt = aide.detail;
    if (maprimeBloquee) {
      txt +=
        " Montant non dû : votre situation (statut ou ancienneté du logement) exclut MaPrimeRénov’ dans cette simulation.";
    }
    det.textContent = txt;
    article.appendChild(det);

    resultBreakdown.appendChild(article);
  });
}

function renderCEEBreakdown(projets, categorie, opts) {
  const {
    ceeBloquee,
    housingTypeVal,
    heatingBeforeVal,
    surfaceARenover,
    postal,
  } = opts;

  const geographical_area = getZoneCEE(postal);

  resultBreakdownCEE.textContent = "";

  let totalPrime = 0;
  let anyComputed = false;

  projets.forEach(function (p, index) {
    const nomProduit = WORK_TYPE_LABELS[p.workType] || p.workType;

    const article = document.createElement("article");
    article.className = "result-product";

    const row = document.createElement("div");
    row.className = "result-product__row";

    const nameEl = document.createElement("span");
    nameEl.className = "result-product__name";
    nameEl.textContent = "Projet " + (index + 1) + " — " + nomProduit;

    const amtEl = document.createElement("span");
    amtEl.className = "result-product__amount";

    const det = document.createElement("p");
    det.className = "result-product__detail";

    if (ceeBloquee) {
      amtEl.classList.add("result-product__amount--zero");
      amtEl.textContent = "0 €";
      det.textContent = "CEE non éligibles : logement de moins de 2 ans.";
      row.appendChild(nameEl);
      row.appendChild(amtEl);
      article.appendChild(row);
      article.appendChild(det);
      resultBreakdownCEE.appendChild(article);
      return;
    }

    if (!geographical_area) {
      amtEl.classList.add("result-product__amount--zero");
      amtEl.textContent = "Non éligible";
      det.textContent = "CEE non simulées : zone CEE introuvable pour ce code postal.";
      row.appendChild(nameEl);
      row.appendChild(amtEl);
      article.appendChild(row);
      article.appendChild(det);
      resultBreakdownCEE.appendChild(article);
      return;
    }

    // Pour double flux : la surface habitable du logement est utilisée (surfaceARenover).
    // Pour les autres travaux au m² ou à l'unité, on utilise p.valeur.
    const surface_m2ForCEE = p.workType === "double flux" ? surfaceARenover : undefined;
    const valeurForCEE = p.workType === "double flux" ? 1 : (p.valeur || 1);

    const prime = calculateCEEPrime(p.workType, {
      postalCode: postal,
      housingType: housingTypeVal,
      heatingBefore: heatingBeforeVal,
      surface_m2: surface_m2ForCEE,
      valeur: valeurForCEE,
    });

    if (prime === null || prime <= 0) {
      amtEl.classList.add("result-product__amount--zero");
      amtEl.textContent = "Non éligible";
      det.textContent = "Ce type de travaux n'est pas couvert par le barème CEE dans ce simulateur.";
    } else {
      totalPrime += prime;
      anyComputed = true;
      amtEl.textContent = formatEuros(prime);
      det.textContent = buildCEEDetailText(p.workType, prime, geographical_area, valeurForCEE, surface_m2ForCEE);
    }

    row.appendChild(nameEl);
    row.appendChild(amtEl);
    article.appendChild(row);
    article.appendChild(det);
    resultBreakdownCEE.appendChild(article);
  });

  return { totalPrime, anyComputed };
}

/**
 * Génère le texte de détail affiché sous le montant CEE.
 */
function buildCEEDetailText(workType, prime, zone, valeur, surface_m2) {
  const zoneLabel = zone ? " (zone " + zone + ")" : "";
  if (workType === "double flux") {
    return "VMC double flux" + zoneLabel + " — surface " + surface_m2 + " m² : prime estimée " + formatEuros(prime) + ".";
  }
  if (workType === "menuiseries") {
    return "Menuiseries" + zoneLabel + " — " + valeur + " ouvrant(s) : prime estimée " + formatEuros(prime) + ".";
  }
  if (workType === "rampants" || workType === "toiture terrasses") {
    return (WORK_TYPE_LABELS[workType] || workType) + zoneLabel + " — " + valeur + " m² : prime estimée " + formatEuros(prime) + ".";
  }
  return (WORK_TYPE_LABELS[workType] || workType) + zoneLabel + " : prime estimée " + formatEuros(prime) + ".";
}


form.addEventListener("submit", function (e) {
  e.preventDefault();

  clearFieldErrors();

  const data = new FormData(form);
  const postal = normalizePostalDigits(data.get("postalCode"));
  const region = deriveRegionFromPostalCode(postal);
  const income = Number(data.get("income"));
  const household = Number(data.get("household"));
  let hasError = false;

  if (!data.get("housingType")) {
    showFieldError("housingType", "Choisissez un type de logement.");
    hasError = true;
  }
  if (!data.get("status")) {
    showFieldError("status", "Choisissez un statut.");
    hasError = true;
  }

  const anneeCourante = new Date().getFullYear();
  const constructionYearRaw = data.get("constructionYear");
  const constructionYear = parseInt(String(constructionYearRaw), 10);
  if (constructionYearRaw === "" || Number.isNaN(constructionYear)) {
    showFieldError("constructionYear", "Indiquez l’année de construction du logement.");
    hasError = true;
  } else if (constructionYear < 1800 || constructionYear > anneeCourante) {
    showFieldError(
      "constructionYear",
      "Indiquez une année de construction réaliste (entre 1800 et " + anneeCourante + ")."
    );
    hasError = true;
  }

  const surfaceRaw = data.get("surfaceARenover");
  const surfaceRenover = Number(surfaceRaw);
  if (surfaceRaw === "" || Number.isNaN(surfaceRenover) || surfaceRenover < 1) {
    showFieldError("surfaceARenover", "Indiquez la surface du logement à rénover (minimum 1 m²).");
    hasError = true;
  }

  const addressLine = String(data.get("addressLine") ?? "").trim();
  if (!addressLine) {
    showFieldError("address", "Indiquez le numéro et la rue.");
    hasError = true;
  }

  const cityLine = String(data.get("city") ?? "").trim();
  if (!cityLine) {
    showFieldError("city", "Indiquez la ville.");
    hasError = true;
  }

  if (!postal || !/^\d{5}$/.test(postal)) {
    showFieldError("postalCode", "Le code postal doit comporter exactement 5 chiffres.");
    hasError = true;
  } else if (!region) {
    showFieldError("postalCode", "Code postal invalide pour le calcul de la région.");
    hasError = true;
  }

  if (data.get("income") === "" || Number.isNaN(income) || income < 0) {
    showFieldError("income", "Indiquez vos revenus fiscaux de référence.");
    hasError = true;
  }

  if (data.get("household") === "" || Number.isNaN(household) || household < 1 || household > 20) {
    showFieldError("household", "Indiquez le nombre de personnes du foyer (1 à 20).");
    hasError = true;
  }

  if (!data.get("heatingBefore")) {
    showFieldError("heatingBefore", "Choisissez l’énergie de chauffage avant travaux.");
    hasError = true;
  }

  const projectRows = projectsContainer.querySelectorAll(".project-row");
  if (!projectRows.length) {
    showProjectsBlockError("Ajoutez au moins un projet de travaux.");
    hasError = true;
  }

  /** @type {{ workType: string, valeur: number }[]} */
  const projets = [];

  projectRows.forEach(function (row) {
    const wt = row.querySelector(".project-work-type").value;
    const kind = getWorkTypeSaisie(wt);
    const qtyInput = row.querySelector(".project-quantity");
    const quantityRaw = qtyInput.value;
    const qVal = Number(quantityRaw);

    if (!wt) {
      showProjectRowError(row, "workType", "Choisissez un type de travaux.");
      hasError = true;
      return;
    }

    if (kind === "surface_m2") {
      if (quantityRaw === "" || Number.isNaN(qVal) || qVal < 1) {
        showProjectRowError(row, "quantity", "Indiquez une surface en m² (minimum 1).");
        hasError = true;
        return;
      }
    } else if (kind === "nombre") {
      if (quantityRaw === "" || Number.isNaN(qVal) || qVal < 1 || !Number.isInteger(qVal)) {
        showProjectRowError(row, "quantity", "Indiquez un nombre entier d’ouvrants (minimum 1).");
        hasError = true;
        return;
      }
    }

    let valeur = 0;
    if (kind === "surface_m2" || kind === "nombre") {
      valeur = qVal;
    }
    projets.push({ workType: wt, valeur });
  });

  if (hasError) {
    focusFirstInvalidField();
    return;
  }

  syncRegionFromPostal();

  runProgressAnimation(function afterProgress() {
    const ileDeFrance = region === "idf";
    const categorie = getCategorieRevenus(income, household, ileDeFrance);
    const housingTypeVal = data.get("housingType");
    const heatingBeforeVal = data.get("heatingBefore");
    const statusVal = data.get("status");
    const ageLogement = getAgeLogementAnnees(constructionYear);

    const messagesBlocage = [];
    let maprimeBloquee = false;
    if (MAPRIME_STATUTS_EXCLUS[statusVal]) {
      maprimeBloquee = true;
      messagesBlocage.push(MAPRIME_STATUTS_EXCLUS[statusVal]);
    }
    if (ageLogement < MAPRIME_AGE_MIN_LOGEMENT) {
      maprimeBloquee = true;
      messagesBlocage.push(
        "Logement d’environ " +
          ageLogement +
          " an" +
          (ageLogement > 1 ? "s" : "") +
          " (moins de " +
          MAPRIME_AGE_MIN_LOGEMENT +
          " ans) : non éligible à MaPrimeRénov’ dans ce scénario."
      );
    }

    const ceeBloquee = ageLogement < 2;
    if (ceeBloquee) {
      messagesBlocage.push("CEE non éligibles : logement de moins de 2 ans.");
    }

    let totalMontant = 0;
    let anyEligible = false;

    if (!maprimeBloquee) {
      projets.forEach(function (p) {
        const aide = calculerAideMPR(categorie, p.workType, p.valeur);
        if (aide.eligible) {
          totalMontant += aide.montant;
          anyEligible = true;
        }
      });
    }

    resultPanel.hidden = false;
    resultPanel.classList.toggle("result--ineligible", !anyEligible);

    if (messagesBlocage.length) {
      resultBlocage.textContent = messagesBlocage.join(" ");
      resultBlocage.hidden = false;
    } else {
      resultBlocage.textContent = "";
      resultBlocage.hidden = true;
    }

    resultCategory.textContent = "Catégorie de revenus : " + CATEGORY_LABELS[categorie] + ".";
    resultSituation.textContent =
      "Surface du logement à rénover (déclarée) : " +
      formatSurfaceM2(surfaceRenover) +
      " m². Année de construction : " +
      constructionYear +
      " (environ " +
      ageLogement +
      " an" +
      (ageLogement > 1 ? "s" : "") +
      ").";

    resultAmount.textContent = anyEligible ? formatEuros(totalMontant) : "Non éligible";
    renderResultBreakdown(projets, categorie, { maprimeBloquee });

    const ceeRes = renderCEEBreakdown(projets, categorie, {
      ceeBloquee,
      housingTypeVal,
      heatingBeforeVal,
      surfaceARenover,
      postal,
    });
    resultCEEAmount.textContent =
      !ceeRes.anyComputed || !Number.isFinite(ceeRes.totalPrime) || ceeRes.totalPrime <= 0
        ? "Non éligible"
        : formatEuros(ceeRes.totalPrime);

    progressBar.style.width = "100%";
    window.setTimeout(function () {
      progressEl.hidden = true;
      progressEl.setAttribute("aria-hidden", "true");
      progressBar.style.width = "0%";
      submitBtn.disabled = false;
      resultPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 320);
  });
});