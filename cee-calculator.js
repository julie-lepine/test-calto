/**
 * Certificats d'économies d'énergie (CEE) — zones, tableur des cumacs, formules.
 * Données issues du tableur métier ; à mettre à jour lors des révisions réglementaires / barèmes.
 */

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
// Table des primes CEE (valeurs extraites du tableur Excel)
//
// Structure de chaque entrée :
//   c           : nom du travail (construction)
//   geo         : zone climatique "H1" | "H2" | "H3"   (undefined si non pertinent)
//   housing     : "maison" | "appartement" (chauffe eau thermo, pac air eau ; undefined sinon)
//   heating     : énergie chauffage avant travaux        (undefined si non pertinent)
//   surfaceSlot : plage de surface m² (double flux, VMC simple flux, pac air air, pac air eau) (undefined si non pertinent)
//   gcf         : geoZoneCorrectionFactor
//   scf         : surfaceARenoverCorrectiveFactor
//   kwh         : nbKwhCumac  (même valeur pour tm/m/i/s dans ce barème)
//   mkwh        : montant € / kWh cumac (foyers modestes, intermédiaires, supérieurs)
//   mkwhTM      : idem pour revenus très modestes (null = reprendre mkwh en attendant saisie)
//
// Formule : (gcf * scf * kwh * mkwhEffectif) / 1000
// ---------------------------------------------------------------------------
const CEE_DATA = [

  // ── chauffe eau solaire combiné ──────────────────────────────────────────
  // Variables : geoZone (col C) + heatingBefore (col F)
  { c: "chauffe eau solaire combiné", geo: "H1", heating: "fioul",       gcf: 1, scf: 1, kwh: 769200, mkwh: 7.280291, mkwhTM: 8.12479688 },
  { c: "chauffe eau solaire combiné", geo: "H1", heating: "gaz",         gcf: 1, scf: 1, kwh: 769200, mkwh: 7.280291, mkwhTM: 8.12479688 },
  { c: "chauffe eau solaire combiné", geo: "H1", heating: "bois",        gcf: 1, scf: 1, kwh: 134800, mkwh: 5.4,      mkwhTM: 7 },
  { c: "chauffe eau solaire combiné", geo: "H1", heating: "electricite", gcf: 1, scf: 1, kwh: 134800, mkwh: 5.4,      mkwhTM: 7 },
  { c: "chauffe eau solaire combiné", geo: "H2", heating: "fioul",       gcf: 1, scf: 1, kwh: 769200, mkwh: 7.280291, mkwhTM: 8.12479688 },
  { c: "chauffe eau solaire combiné", geo: "H2", heating: "gaz",         gcf: 1, scf: 1, kwh: 769200, mkwh: 7.280291, mkwhTM: 8.12479688 },
  { c: "chauffe eau solaire combiné", geo: "H2", heating: "bois",        gcf: 1, scf: 1, kwh: 121000, mkwh: 5.4,      mkwhTM: 7 },
  { c: "chauffe eau solaire combiné", geo: "H2", heating: "electricite", gcf: 1, scf: 1, kwh: 121000, mkwh: 5.4,      mkwhTM: 7 },
  { c: "chauffe eau solaire combiné", geo: "H3", heating: "fioul",       gcf: 1, scf: 1, kwh: 769200, mkwh: 7.280291, mkwhTM: 8.12479688 },
  { c: "chauffe eau solaire combiné", geo: "H3", heating: "gaz",         gcf: 1, scf: 1, kwh: 769200, mkwh: 7.280291, mkwhTM: 8.12479688 },
  { c: "chauffe eau solaire combiné", geo: "H3", heating: "bois",        gcf: 1, scf: 1, kwh: 100500, mkwh: 5.4,      mkwhTM: 7 },
  { c: "chauffe eau solaire combiné", geo: "H3", heating: "electricite", gcf: 1, scf: 1, kwh: 100500, mkwh: 5.4,      mkwhTM: 7 },

  // ── chauffe eau solaire individuel ───────────────────────────────────────
  // Variable : geoZone (col C)
  { c: "chauffe eau solaire individuel", geo: "H1", gcf: 1, scf: 1, kwh: 18500, mkwh: 5.4, mkwhTM: 7 },
  { c: "chauffe eau solaire individuel", geo: "H2", gcf: 1, scf: 1, kwh: 21000, mkwh: 5.4, mkwhTM: 7 },
  { c: "chauffe eau solaire individuel", geo: "H3", gcf: 1, scf: 1, kwh: 24200, mkwh: 5.4, mkwhTM: 7 },

  // ── chauffe eau thermo ───────────────────────────────────────────────────
  // Variable : housingType (col B)
  { c: "chauffe eau thermo", housing: "maison",      gcf: 1, scf: 1, kwh: 14700, mkwh: 5.4, mkwhTM: 7 },
  { c: "chauffe eau thermo", housing: "appartement", gcf: 1, scf: 1, kwh: 11800, mkwh: 5.4, mkwhTM: 7 },

  // ── double flux ──────────────────────────────────────────────────────────
  // Variables : geoZone (col C) + surface_m2 (col G) → surfaceSlot → scf
  { c: "double flux", geo: "H1", surfaceSlot: "S < 35",        gcf: 1, scf: 0.3, kwh: 39700, mkwh: 5.4, mkwhTM: 7 },
  { c: "double flux", geo: "H2", surfaceSlot: "S < 35",        gcf: 1, scf: 0.3, kwh: 32500, mkwh: 5.4, mkwhTM: 7 },
  { c: "double flux", geo: "H3", surfaceSlot: "S < 35",        gcf: 1, scf: 0.3, kwh: 21600, mkwh: 5.4, mkwhTM: 7 },
  { c: "double flux", geo: "H1", surfaceSlot: "35 ≤ S < 60",   gcf: 1, scf: 0.5, kwh: 39700, mkwh: 5.4, mkwhTM: 7 },
  { c: "double flux", geo: "H2", surfaceSlot: "35 ≤ S < 60",   gcf: 1, scf: 0.5, kwh: 32500, mkwh: 5.4, mkwhTM: 7 },
  { c: "double flux", geo: "H3", surfaceSlot: "35 ≤ S < 60",   gcf: 1, scf: 0.5, kwh: 21600, mkwh: 5.4, mkwhTM: 7 },
  { c: "double flux", geo: "H1", surfaceSlot: "60 ≤ S < 70",   gcf: 1, scf: 0.6, kwh: 39700, mkwh: 5.4, mkwhTM: 7 },
  { c: "double flux", geo: "H2", surfaceSlot: "60 ≤ S < 70",   gcf: 1, scf: 0.6, kwh: 32500, mkwh: 5.4, mkwhTM: 7 },
  { c: "double flux", geo: "H3", surfaceSlot: "60 ≤ S < 70",   gcf: 1, scf: 0.6, kwh: 21600, mkwh: 5.4, mkwhTM: 7 },
  { c: "double flux", geo: "H1", surfaceSlot: "70 ≤ S < 90",   gcf: 1, scf: 0.7, kwh: 39700, mkwh: 5.4, mkwhTM: 7 },
  { c: "double flux", geo: "H2", surfaceSlot: "70 ≤ S < 90",   gcf: 1, scf: 0.7, kwh: 32500, mkwh: 5.4, mkwhTM: 7 },
  { c: "double flux", geo: "H3", surfaceSlot: "70 ≤ S < 90",   gcf: 1, scf: 0.7, kwh: 21600, mkwh: 5.4, mkwhTM: 7 },
  { c: "double flux", geo: "H1", surfaceSlot: "90 ≤ S < 110",  gcf: 1, scf: 1.0, kwh: 39700, mkwh: 5.4, mkwhTM: 7 },
  { c: "double flux", geo: "H2", surfaceSlot: "90 ≤ S < 110",  gcf: 1, scf: 1.0, kwh: 32500, mkwh: 5.4, mkwhTM: 7 },
  { c: "double flux", geo: "H3", surfaceSlot: "90 ≤ S < 110",  gcf: 1, scf: 1.0, kwh: 21600, mkwh: 5.4, mkwhTM: 7 },
  { c: "double flux", geo: "H1", surfaceSlot: "110 ≤ S ≤ 130", gcf: 1, scf: 1.1, kwh: 39700, mkwh: 5.4, mkwhTM: 7 },
  { c: "double flux", geo: "H2", surfaceSlot: "110 ≤ S ≤ 130", gcf: 1, scf: 1.1, kwh: 32500, mkwh: 5.4, mkwhTM: 7 },
  { c: "double flux", geo: "H3", surfaceSlot: "110 ≤ S ≤ 130", gcf: 1, scf: 1.1, kwh: 21600, mkwh: 5.4, mkwhTM: 7 },
  { c: "double flux", geo: "H1", surfaceSlot: "130 < S",        gcf: 1, scf: 1.6, kwh: 39700, mkwh: 5.4, mkwhTM: 7 },
  { c: "double flux", geo: "H2", surfaceSlot: "130 < S",        gcf: 1, scf: 1.6, kwh: 32500, mkwh: 5.4, mkwhTM: 7 },
  { c: "double flux", geo: "H3", surfaceSlot: "130 < S",        gcf: 1, scf: 1.6, kwh: 21600, mkwh: 5.4, mkwhTM: 7 },

  // ── menuiseries ──────────────────────────────────────────────────────────
  // Variable : geoZone (col C) — résultat × valeur (nb d'unités)
  { c: "menuiseries", geo: "H1", gcf: 1, scf: 1, kwh: 3800, mkwh: 5.4, mkwhTM: 7 },
  { c: "menuiseries", geo: "H2", gcf: 1, scf: 1, kwh: 3100, mkwh: 5.4, mkwhTM: 7 },
  { c: "menuiseries", geo: "H3", gcf: 1, scf: 1, kwh: 2100, mkwh: 5.4, mkwhTM: 7 },

  // ── rampants / combles perdus ───────────────────────────────────────────
  { c: "rampants", geo: "H1", gcf: 1, scf: 1, kwh: 1700, mkwh: 5.4, mkwhTM: 7 },
  { c: "rampants", geo: "H2", gcf: 1, scf: 1, kwh: 1400, mkwh: 5.4, mkwhTM: 7 },
  { c: "rampants", geo: "H3", gcf: 1, scf: 1, kwh: 920, mkwh: 5.4, mkwhTM: 7 },
  { c: "combles perdus", geo: "H1", gcf: 1, scf: 1, kwh: 1700, mkwh: 5.4, mkwhTM: 7 },
  { c: "combles perdus", geo: "H2", gcf: 1, scf: 1, kwh: 1400, mkwh: 5.4, mkwhTM: 7 },
  { c: "combles perdus", geo: "H3", gcf: 1, scf: 1, kwh: 920, mkwh: 5.4, mkwhTM: 7 },

  // ── toiture terrasses ────────────────────────────────────────────────────
  // Variable : geoZone (col C) — résultat × valeur (surface m²)
  { c: "toiture terrasses", geo: "H1", gcf: 1, scf: 1, kwh: 1200, mkwh: 5.4, mkwhTM: 7 },
  { c: "toiture terrasses", geo: "H2", gcf: 1, scf: 1, kwh: 1000, mkwh: 5.4, mkwhTM: 7 },
  { c: "toiture terrasses", geo: "H3", gcf: 1, scf: 1, kwh: 670, mkwh: 5.4, mkwhTM: 7 },

    // ── murs ────────────────────────────────────────────────────
  // Variable : geoZone (col C) — résultat × valeur (surface m²)
  { c: "murs", geo: "H1", gcf: 1, scf: 1, kwh: 1600, mkwh: 5.4, mkwhTM: 7 },
  { c: "murs", geo: "H2", gcf: 1, scf: 1, kwh: 1300, mkwh: 5.4, mkwhTM: 7 },
  { c: "murs", geo: "H3", gcf: 1, scf: 1, kwh: 880, mkwh: 5.4, mkwhTM: 7 },

  // ── plancher (bas) ──────────────────────────────────────────────────────
  { c: "plancher", geo: "H1", gcf: 1, scf: 1, kwh: 1100, mkwh: 5.4, mkwhTM: 7 },
  { c: "plancher", geo: "H2", gcf: 1, scf: 1, kwh: 890, mkwh: 5.4, mkwhTM: 7 },
  { c: "plancher", geo: "H3", gcf: 1, scf: 1, kwh: 590, mkwh: 5.4, mkwhTM: 7 },

  // ── poêles / foyers ──────────────────────────────────────────────────────
  { c: "poele buches", geo: "H1", gcf: 1, scf: 1, kwh: 23500, mkwh: 5.4, mkwhTM: 7 },
  { c: "poele buches", geo: "H2", gcf: 1, scf: 1, kwh: 19300, mkwh: 5.4, mkwhTM: 7 },
  { c: "poele buches", geo: "H3", gcf: 1, scf: 1, kwh: 12800, mkwh: 5.4, mkwhTM: 7 },
  { c: "poele granules", geo: "H1", gcf: 1, scf: 1, kwh: 23500, mkwh: 5.4, mkwhTM: 7 },
  { c: "poele granules", geo: "H2", gcf: 1, scf: 1, kwh: 19300, mkwh: 5.4, mkwhTM: 7 },
  { c: "poele granules", geo: "H3", gcf: 1, scf: 1, kwh: 12800, mkwh: 5.4, mkwhTM: 7 },
  { c: "foyer ferme", geo: "H1", gcf: 1, scf: 1, kwh: 23500, mkwh: 5.4, mkwhTM: 7 },
  { c: "foyer ferme", geo: "H2", gcf: 1, scf: 1, kwh: 19300, mkwh: 5.4, mkwhTM: 7 },
  { c: "foyer ferme", geo: "H3", gcf: 1, scf: 1, kwh: 12800, mkwh: 5.4, mkwhTM: 7 },

    // ── simple flux ──────────────────────────────────────────────────────────
  // Variables : geoZone (col C) + surface_m2 (col G) → surfaceSlot → scf
  // kwhTM : kWh cumac si catégorie « très modeste » (null = même kwh que les autres catégories)
  { c: "vmc simple flux", geo: "H1", surfaceSlot: "S < 35",        gcf: 1, scf: 0.3, kwh: 31600, mkwh: 5.4, mkwhTM: 7 },
  { c: "vmc simple flux", geo: "H2", surfaceSlot: "S < 35",        gcf: 1, scf: 0.3, kwh: 25900, mkwh: 5.4, mkwhTM: 7 },
  { c: "vmc simple flux", geo: "H3", surfaceSlot: "S < 35",        gcf: 1, scf: 0.3, kwh: 17200, mkwh: 5.4, mkwhTM: 7 },
  { c: "vmc simple flux", geo: "H1", surfaceSlot: "35 ≤ S < 60",   gcf: 1, scf: 0.5, kwh: 31600, mkwh: 5.4, mkwhTM: 7 },
  { c: "vmc simple flux", geo: "H2", surfaceSlot: "35 ≤ S < 60",   gcf: 1, scf: 0.5, kwh: 25900, mkwh: 5.4, mkwhTM: 7 },
  { c: "vmc simple flux", geo: "H3", surfaceSlot: "35 ≤ S < 60",   gcf: 1, scf: 0.5, kwh: 17200, mkwh: 5.4, mkwhTM: 7 },
  { c: "vmc simple flux", geo: "H1", surfaceSlot: "60 ≤ S < 70",   gcf: 1, scf: 0.6, kwh: 31600, mkwh: 5.4, mkwhTM: 7 },
  { c: "vmc simple flux", geo: "H2", surfaceSlot: "60 ≤ S < 70",   gcf: 1, scf: 0.6, kwh: 25900, mkwh: 5.4, mkwhTM: 7 },
  { c: "vmc simple flux", geo: "H3", surfaceSlot: "60 ≤ S < 70",   gcf: 1, scf: 0.6, kwh: 17200, mkwh: 5.4, mkwhTM: 7 },
  { c: "vmc simple flux", geo: "H1", surfaceSlot: "70 ≤ S < 90",   gcf: 1, scf: 0.7, kwh: 31600, mkwh: 5.4, mkwhTM: 7 },
  { c: "vmc simple flux", geo: "H2", surfaceSlot: "70 ≤ S < 90",   gcf: 1, scf: 0.7, kwh: 25900, mkwh: 5.4, mkwhTM: 7 },
  { c: "vmc simple flux", geo: "H3", surfaceSlot: "70 ≤ S < 90",   gcf: 1, scf: 0.7, kwh: 17200, mkwh: 5.4, mkwhTM: 7 },
  { c: "vmc simple flux", geo: "H1", surfaceSlot: "90 ≤ S < 110",  gcf: 1, scf: 1.0, kwh: 31600, mkwh: 5.4, mkwhTM: 7 },
  { c: "vmc simple flux", geo: "H2", surfaceSlot: "90 ≤ S < 110",  gcf: 1, scf: 1.0, kwh: 25900, mkwh: 5.4, mkwhTM: 7 },
  { c: "vmc simple flux", geo: "H3", surfaceSlot: "90 ≤ S < 110",  gcf: 1, scf: 1.0, kwh: 17200, mkwh: 5.4, mkwhTM: 7 },
  { c: "vmc simple flux", geo: "H1", surfaceSlot: "110 ≤ S ≤ 130", gcf: 1, scf: 1.1, kwh: 31600, mkwh: 5.4, mkwhTM: 7 },
  { c: "vmc simple flux", geo: "H2", surfaceSlot: "110 ≤ S ≤ 130", gcf: 1, scf: 1.1, kwh: 25900, mkwh: 5.4, mkwhTM: 7 },
  { c: "vmc simple flux", geo: "H3", surfaceSlot: "110 ≤ S ≤ 130", gcf: 1, scf: 1.1, kwh: 17200, mkwh: 5.4, mkwhTM: 7 },
  { c: "vmc simple flux", geo: "H1", surfaceSlot: "130 < S",        gcf: 1, scf: 1.6, kwh: 31600, mkwh: 5.4, mkwhTM: 7 },
  { c: "vmc simple flux", geo: "H2", surfaceSlot: "130 < S",        gcf: 1, scf: 1.6, kwh: 25900, mkwh: 5.4, mkwhTM: 7 },
  { c: "vmc simple flux", geo: "H3", surfaceSlot: "130 < S",        gcf: 1, scf: 1.6, kwh: 17200, mkwh: 5.4, mkwhTM: 7 },

      // ── pac air air ──────────────────────────────────────────────────────────
  // Variables : geoZone (col C) + surface_m2 (col G) → surfaceSlot → scf
  // kwhTM : kWh cumac si catégorie « très modeste » (null = même kwh que les autres catégories)
  { c: "pac air air", geo: "H1", surfaceSlot: "S < 35",        gcf: 1, scf: 0.3, kwh: 77900, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air air", geo: "H2", surfaceSlot: "S < 35",        gcf: 1, scf: 0.3, kwh: 63700, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air air", geo: "H3", surfaceSlot: "S < 35",        gcf: 1, scf: 0.3, kwh: 42500, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air air", geo: "H1", surfaceSlot: "35 ≤ S < 60",   gcf: 1, scf: 0.5, kwh: 77900, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air air", geo: "H2", surfaceSlot: "35 ≤ S < 60",   gcf: 1, scf: 0.5, kwh: 63700, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air air", geo: "H3", surfaceSlot: "35 ≤ S < 60",   gcf: 1, scf: 0.5, kwh: 42500, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air air", geo: "H1", surfaceSlot: "60 ≤ S < 70",   gcf: 1, scf: 0.6, kwh: 77900, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air air", geo: "H2", surfaceSlot: "60 ≤ S < 70",   gcf: 1, scf: 0.6, kwh: 63700, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air air", geo: "H3", surfaceSlot: "60 ≤ S < 70",   gcf: 1, scf: 0.6, kwh: 42500, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air air", geo: "H1", surfaceSlot: "70 ≤ S < 90",   gcf: 1, scf: 0.7, kwh: 77900, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air air", geo: "H2", surfaceSlot: "70 ≤ S < 90",   gcf: 1, scf: 0.7, kwh: 63700, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air air", geo: "H3", surfaceSlot: "70 ≤ S < 90",   gcf: 1, scf: 0.7, kwh: 42500, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air air", geo: "H1", surfaceSlot: "90 ≤ S < 110",  gcf: 1, scf: 1.0, kwh: 77900, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air air", geo: "H2", surfaceSlot: "90 ≤ S < 110",  gcf: 1, scf: 1.0, kwh: 63700, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air air", geo: "H3", surfaceSlot: "90 ≤ S < 110",  gcf: 1, scf: 1.0, kwh: 42500, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air air", geo: "H1", surfaceSlot: "110 ≤ S ≤ 130", gcf: 1, scf: 1.1, kwh: 77900, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air air", geo: "H2", surfaceSlot: "110 ≤ S ≤ 130", gcf: 1, scf: 1.1, kwh: 63700, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air air", geo: "H3", surfaceSlot: "110 ≤ S ≤ 130", gcf: 1, scf: 1.1, kwh: 42500, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air air", geo: "H1", surfaceSlot: "130 < S",        gcf: 1, scf: 1.6, kwh: 77900, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air air", geo: "H2", surfaceSlot: "130 < S",        gcf: 1, scf: 1.6, kwh: 63700, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air air", geo: "H3", surfaceSlot: "130 < S",        gcf: 1, scf: 1.6, kwh: 42500, mkwh: 5.4, mkwhTM: 7 },

  // ── pac air eau — maison ──────────────────────────────────────────────────
  // Comme pac air air : geo + surfaceSlot → scf + heating + housing (maison / appartement = cumacs distincts).
  // Cumacs électricité / bois (ajuster kwh depuis le tableur).
  { c: "pac air eau", housing: "maison", geo: "H1", heating: "electricite", surfaceSlot: "S < 70",        gcf: 1, scf: 0.5, kwh: 90900, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "maison", geo: "H2", heating: "electricite", surfaceSlot: "S < 70",        gcf: 1, scf: 0.5, kwh: 90900, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "maison", geo: "H3", heating: "electricite", surfaceSlot: "S < 70",        gcf: 1, scf: 0.5, kwh: 90900, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "maison", geo: "H1", heating: "electricite", surfaceSlot: "70 ≤ S < 90",   gcf: 1, scf: 0.7, kwh: 90900, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "maison", geo: "H2", heating: "electricite", surfaceSlot: "70 ≤ S < 90",   gcf: 1, scf: 0.7, kwh: 90900, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "maison", geo: "H3", heating: "electricite", surfaceSlot: "70 ≤ S < 90",   gcf: 1, scf: 0.7, kwh: 90900, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "maison", geo: "H1", heating: "electricite", surfaceSlot: "90 ≤ S",        gcf: 1, scf: 1, kwh: 90900, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "maison", geo: "H2", heating: "electricite", surfaceSlot: "90 ≤ S",        gcf: 1, scf: 1, kwh: 90900, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "maison", geo: "H3", heating: "electricite", surfaceSlot: "90 ≤ S",        gcf: 1, scf: 1, kwh: 90900, mkwh: 5.4, mkwhTM: 7 },
  // Cumacs bois (identiques à électricité si le barème les regroupe).
  { c: "pac air eau", housing: "maison", geo: "H1", heating: "bois", surfaceSlot: "S < 70",        gcf: 1, scf: 0.5, kwh: 90900, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "maison", geo: "H2", heating: "bois", surfaceSlot: "S < 70",        gcf: 1, scf: 0.5, kwh: 90900, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "maison", geo: "H3", heating: "bois", surfaceSlot: "S < 70",        gcf: 1, scf: 0.5, kwh: 90900, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "maison", geo: "H1", heating: "bois", surfaceSlot: "70 ≤ S < 90",   gcf: 1, scf: 0.7, kwh: 90900, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "maison", geo: "H2", heating: "bois", surfaceSlot: "70 ≤ S < 90",   gcf: 1, scf: 0.7, kwh: 90900, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "maison", geo: "H3", heating: "bois", surfaceSlot: "70 ≤ S < 90",   gcf: 1, scf: 0.7, kwh: 90900, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "maison", geo: "H1", heating: "bois", surfaceSlot: "90 ≤ S",        gcf: 1, scf: 1, kwh: 90900, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "maison", geo: "H2", heating: "bois", surfaceSlot: "90 ≤ S",        gcf: 1, scf: 1, kwh: 90900, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "maison", geo: "H3", heating: "bois", surfaceSlot: "90 ≤ S",        gcf: 1, scf: 1, kwh: 90900, mkwh: 5.4, mkwhTM: 7 },
  // Cumacs fioul / gaz (ajuster — provisoire = mêmes valeurs que pac air air).
  { c: "pac air eau", housing: "maison", geo: "H1", heating: "fioul", surfaceSlot: "S < 70",        gcf: 1, scf: 0.5, kwh: 454500, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "maison", geo: "H2", heating: "fioul", surfaceSlot: "S < 70",        gcf: 1, scf: 0.5, kwh: 454500, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "maison", geo: "H3", heating: "fioul", surfaceSlot: "S < 70",        gcf: 1, scf: 0.5, kwh: 454500, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "maison", geo: "H1", heating: "fioul", surfaceSlot: "70 ≤ S < 90",   gcf: 1, scf: 0.7, kwh: 454500, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "maison", geo: "H2", heating: "fioul", surfaceSlot: "70 ≤ S < 90",   gcf: 1, scf: 0.7, kwh: 454500, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "maison", geo: "H3", heating: "fioul", surfaceSlot: "70 ≤ S < 90",   gcf: 1, scf: 0.7, kwh: 454500, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "maison", geo: "H1", heating: "fioul", surfaceSlot: "90 ≤ S",        gcf: 1, scf: 1, kwh: 454500, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "maison", geo: "H2", heating: "fioul", surfaceSlot: "90 ≤ S",        gcf: 1, scf: 1, kwh: 454500, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "maison", geo: "H3", heating: "fioul", surfaceSlot: "90 ≤ S",        gcf: 1, scf: 1, kwh: 454500, mkwh: 5.4, mkwhTM: 7 },
  
  { c: "pac air eau", housing: "maison", geo: "H1", heating: "gaz", surfaceSlot: "S < 70",        gcf: 1, scf: 0.5, kwh: 454500, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "maison", geo: "H2", heating: "gaz", surfaceSlot: "S < 70",        gcf: 1, scf: 0.5, kwh: 454500, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "maison", geo: "H3", heating: "gaz", surfaceSlot: "S < 70",        gcf: 1, scf: 0.5, kwh: 454500, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "maison", geo: "H1", heating: "gaz", surfaceSlot: "70 ≤ S < 90",   gcf: 1, scf: 0.7, kwh: 454500, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "maison", geo: "H2", heating: "gaz", surfaceSlot: "70 ≤ S < 90",   gcf: 1, scf: 0.7, kwh: 454500, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "maison", geo: "H3", heating: "gaz", surfaceSlot: "70 ≤ S < 90",   gcf: 1, scf: 0.7, kwh: 454500, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "maison", geo: "H1", heating: "gaz", surfaceSlot: "90 ≤ S",        gcf: 1, scf: 1, kwh: 454500, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "maison", geo: "H2", heating: "gaz", surfaceSlot: "90 ≤ S",        gcf: 1, scf: 1, kwh: 454500, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "maison", geo: "H3", heating: "gaz", surfaceSlot: "90 ≤ S",        gcf: 1, scf: 1, kwh: 454500, mkwh: 5.4, mkwhTM: 7 },
  // ── pac air eau — logement appartement (mêmes tranches ; cumacs kwh à saisir au tableur).
  { c: "pac air eau", housing: "appartement", geo: "H1", heating: "electricite", surfaceSlot: "S < 35",        gcf: 1, scf: 0.5, kwh: 48700, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "appartement", geo: "H2", heating: "electricite", surfaceSlot: "S < 35",        gcf: 1, scf: 0.5, kwh: 48700, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "appartement", geo: "H3", heating: "electricite", surfaceSlot: "S < 35",        gcf: 1, scf: 0.5, kwh: 48700, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "appartement", geo: "H1", heating: "electricite", surfaceSlot: "35 ≤ S < 60",   gcf: 1, scf: 0.7, kwh: 48700, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "appartement", geo: "H2", heating: "electricite", surfaceSlot: "35 ≤ S < 60",   gcf: 1, scf: 0.7, kwh: 48700, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "appartement", geo: "H3", heating: "electricite", surfaceSlot: "35 ≤ S < 60",   gcf: 1, scf: 0.7, kwh: 48700, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "appartement", geo: "H1", heating: "electricite", surfaceSlot: "60 ≤ S",   gcf: 1, scf: 1, kwh: 48700, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "appartement", geo: "H2", heating: "electricite", surfaceSlot: "60 ≤ S",   gcf: 1, scf: 1, kwh: 48700, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "appartement", geo: "H3", heating: "electricite", surfaceSlot: "60 ≤ S",   gcf: 1, scf: 1, kwh: 48700, mkwh: 5.4, mkwhTM: 7 },
  // Cumacs bois (identiques à électricité si le barème les regroupe).
  { c: "pac air eau", housing: "appartement", geo: "H1", heating: "bois", surfaceSlot: "S < 35",        gcf: 1, scf: 0.5, kwh: 48700, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "appartement", geo: "H2", heating: "bois", surfaceSlot: "S < 35",        gcf: 1, scf: 0.5, kwh: 48700, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "appartement", geo: "H3", heating: "bois", surfaceSlot: "S < 35",        gcf: 1, scf: 0.5, kwh: 48700, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "appartement", geo: "H1", heating: "bois", surfaceSlot: "35 ≤ S < 60",   gcf: 1, scf: 0.7, kwh: 48700, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "appartement", geo: "H2", heating: "bois", surfaceSlot: "35 ≤ S < 60",   gcf: 1, scf: 0.7, kwh: 48700, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "appartement", geo: "H3", heating: "bois", surfaceSlot: "35 ≤ S < 60",   gcf: 1, scf: 0.7, kwh: 48700, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "appartement", geo: "H1", heating: "bois", surfaceSlot: "60 ≤ S",   gcf: 1, scf: 1, kwh: 48700, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "appartement", geo: "H2", heating: "bois", surfaceSlot: "60 ≤ S",   gcf: 1, scf: 1, kwh: 48700, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "appartement", geo: "H3", heating: "bois", surfaceSlot: "60 ≤ S",   gcf: 1, scf: 1, kwh: 48700, mkwh: 5.4, mkwhTM: 7 },
  // Cumacs fioul / gaz (ajuster — provisoire = mêmes valeurs que pac air air).
  { c: "pac air eau", housing: "appartement", geo: "H1", heating: "fioul", surfaceSlot: "S < 35",        gcf: 1, scf: 0.5, kwh: 243500, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "appartement", geo: "H2", heating: "fioul", surfaceSlot: "S < 35",        gcf: 1, scf: 0.5, kwh: 243500, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "appartement", geo: "H3", heating: "fioul", surfaceSlot: "S < 35",        gcf: 1, scf: 0.5, kwh: 243500, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "appartement", geo: "H1", heating: "fioul", surfaceSlot: "35 ≤ S < 60",   gcf: 1, scf: 0.7, kwh: 243500, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "appartement", geo: "H2", heating: "fioul", surfaceSlot: "35 ≤ S < 60",   gcf: 1, scf: 0.7, kwh: 243500, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "appartement", geo: "H3", heating: "fioul", surfaceSlot: "35 ≤ S < 60",   gcf: 1, scf: 0.7, kwh: 243500, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "appartement", geo: "H1", heating: "fioul", surfaceSlot: "60 ≤ S",   gcf: 1, scf: 1, kwh: 243500, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "appartement", geo: "H2", heating: "fioul", surfaceSlot: "60 ≤ S",   gcf: 1, scf: 1, kwh: 243500, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "appartement", geo: "H3", heating: "fioul", surfaceSlot: "60 ≤ S",   gcf: 1, scf: 1, kwh: 243500, mkwh: 5.4, mkwhTM: 7 },

  { c: "pac air eau", housing: "appartement", geo: "H1", heating: "gaz", surfaceSlot: "S < 35",        gcf: 1, scf: 0.5, kwh: 243500, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "appartement", geo: "H2", heating: "gaz", surfaceSlot: "S < 35",        gcf: 1, scf: 0.5, kwh: 243500, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "appartement", geo: "H3", heating: "gaz", surfaceSlot: "S < 35",        gcf: 1, scf: 0.5, kwh: 243500, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "appartement", geo: "H1", heating: "gaz", surfaceSlot: "35 ≤ S < 60",   gcf: 1, scf: 0.7, kwh: 243500, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "appartement", geo: "H2", heating: "gaz", surfaceSlot: "35 ≤ S < 60",   gcf: 1, scf: 0.7, kwh: 243500, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "appartement", geo: "H3", heating: "gaz", surfaceSlot: "35 ≤ S < 60",   gcf: 1, scf: 0.7, kwh: 243500, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "appartement", geo: "H1", heating: "gaz", surfaceSlot: "60 ≤ S",   gcf: 1, scf: 1, kwh: 243500, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "appartement", geo: "H2", heating: "gaz", surfaceSlot: "60 ≤ S",   gcf: 1, scf: 1, kwh: 243500, mkwh: 5.4, mkwhTM: 7 },
  { c: "pac air eau", housing: "appartement", geo: "H3", heating: "gaz", surfaceSlot: "60 ≤ S",   gcf: 1, scf: 1, kwh: 243500, mkwh: 5.4, mkwhTM: 7 },
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
 * Tranches « surface à rénover » pour PAC air / eau : maison (S < 70 / 70–90 / ≥ 90 m²),
 * appartement (S < 35 / 35–60 / ≥ 60 m²) — aligné sur CEE_DATA.
 * @param {number} surface_m2
 * @param {string} [housingType]
 * @returns {string|null}
 */
function getSurfaceSlotPacAirEau(surface_m2, housingType) {
  const s = Number(surface_m2);
  if (!Number.isFinite(s)) return null;
  const h = (housingType || "").toLowerCase();
  if (h === "appartement") {
    if (s < 35) return "S < 35";
    if (s < 60) return "35 ≤ S < 60";
    return "60 ≤ S";
  }
  if (s < 70) return "S < 70";
  if (s < 90) return "70 ≤ S < 90";
  return "90 ≤ S";
}

/**
 * € / kWh cumac utilisé dans la formule : mkwhTM si catégorie très modeste et valeur renseignée, sinon mkwh.
 *
 * @param {{ mkwh: number, mkwhTM?: number|null }} row
 * @param {'tres_modeste'|'modeste'|'intermediaire'|'superieur'|undefined} categorieRevenus
 */
function effectiveMkwh(row, categorieRevenus) {
  if (categorieRevenus === "tres_modeste") {
    const tm = row.mkwhTM;
    if (tm !== null && tm !== undefined && Number.isFinite(Number(tm))) {
      return Number(tm);
    }
  }
  return row.mkwh;
}

/**
 * kWh cumac utilisé dans la formule : kwhTM si catégorie très modeste et valeur renseignée, sinon kwh.
 *
 * @param {{ kwh: number, kwhTM?: number|null }} row
 * @param {'tres_modeste'|'modeste'|'intermediaire'|'superieur'|undefined} categorieRevenus
 */
function effectiveKwh(row, categorieRevenus) {
  if (categorieRevenus === "tres_modeste") {
    const tm = row.kwhTM;
    if (tm !== null && tm !== undefined && Number.isFinite(Number(tm))) {
      return Number(tm);
    }
  }
  return row.kwh;
}

/**
 * Applique la formule : (gcf * scf * kwhEffectif * mkwhEffectif) / 1000
 *
 * @param {{ gcf: number, scf: number, kwh: number, kwhTM?: number|null, mkwh: number, mkwhTM?: number|null }} row
 * @param {'tres_modeste'|'modeste'|'intermediaire'|'superieur'|undefined} [categorieRevenus]
 */
function applyFormula(row, categorieRevenus) {
  const kwh = effectiveKwh(row, categorieRevenus);
  const mkwh = effectiveMkwh(row, categorieRevenus);
  return (row.gcf * row.scf * kwh * mkwh) / 1000;
}

// ---------------------------------------------------------------------------
// Fonction principale — prime pour UNE catégorie de revenu
// ---------------------------------------------------------------------------

/**
 * Calcule les primes CEE pour tous les types de travaux applicables.
 *
 * @param {Object} params
 * @param {string}  params.postalCode       Code postal du logement
 * @param {'tres_modeste'|'modeste'|'intermediaire'|'superieur'} [params.categorieRevenus] Typologie foyer (pour mkwh TM)
 * @param {number}  params.revenuFiscalRef  (conservé pour compatibilité signature)
 * @param {number}  params.nbPersonnes       (idem)
 * @param {string}  params.housingType      "maison" | "appartement"
 * @param {string}  params.heatingBefore    "bois" | "electricite" | "fioul" | "gaz"
 * @param {number}  [params.surface_m2]     Surface habitable (double flux uniquement)
 * @param {number}  [params.valeur=1]       Multiplicateur (menuiseries / rampants / toiture terrasses)
 * @returns {{ [travaux: string]: number }}
 */
function calculateCEEPrimes({
  postalCode,
  categorieRevenus,
  revenuFiscalRef,
  nbPersonnes,
  housingType,
  heatingBefore,
  surface_m2,
  valeur = 1,
}) {
  void revenuFiscalRef;
  void nbPersonnes;

  // Zone géographique (H1 / H2 / H3)
  const geoZone = getZoneCEE(postalCode);

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
    result["chauffe eau solaire combiné"] = applyFormula(cescRow, categorieRevenus);
  }

  // ── chauffe eau solaire individuel ───────────────────────────────────────
  const cesiRow = CEE_DATA.find(r =>
    r.c === "chauffe eau solaire individuel" &&
    r.geo === geoZone
  );
  if (cesiRow) {
    result["chauffe eau solaire individuel"] = applyFormula(cesiRow, categorieRevenus);
  }

  // ── chauffe eau thermo ───────────────────────────────────────────────────
  const cetRow = CEE_DATA.find(r =>
    r.c === "chauffe eau thermo" &&
    r.housing === housing
  );
  if (cetRow) {
    result["chauffe eau thermo"] = applyFormula(cetRow, categorieRevenus);
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
      result["double flux"] = applyFormula(dfRow, categorieRevenus);
    }
    const slotVmc = getSurfaceSlotDoubleFlux(surface_m2);
    const vmcRow = CEE_DATA.find(r =>
      r.c === "vmc simple flux" &&
      r.geo === geoZone &&
      r.surfaceSlot === slotVmc
    );
    if (vmcRow) {
      result["vmc simple flux"] = applyFormula(vmcRow, categorieRevenus);
    }
  }

  // ── pac air air & pac air eau (surface + zone ; chauffage + logement pour eau) ─
  if (surface_m2 !== undefined && surface_m2 !== null && geoZone) {
    const slotPac = getSurfaceSlotDoubleFlux(surface_m2);
    const pacAA = CEE_DATA.find(r =>
      r.c === "pac air air" &&
      r.geo === geoZone &&
      r.surfaceSlot === slotPac
    );
    if (pacAA) {
      result["pac air air"] = applyFormula(pacAA, categorieRevenus);
    }
    const slotPacAE = getSurfaceSlotPacAirEau(surface_m2, housingType);
    const pacAE = slotPacAE
      ? CEE_DATA.find(r =>
          r.c === "pac air eau" &&
          r.housing === housing &&
          r.geo === geoZone &&
          r.surfaceSlot === slotPacAE &&
          r.heating === heating
        )
      : null;
    if (pacAE) {
      result["pac air eau"] = applyFormula(pacAE, categorieRevenus);
    }
  }

  // ── menuiseries — × valeur (nb d'unités) ─────────────────────────────────
  const menuRow = CEE_DATA.find(r =>
    r.c === "menuiseries" && r.geo === geoZone
  );
  if (menuRow) {
    result["menuiseries"] = applyFormula(menuRow, categorieRevenus) * valeur;
  }

  // ── rampants — × valeur (m²) ─────────────────────────────────────────────
  const rampRow = CEE_DATA.find(r =>
    r.c === "rampants" && r.geo === geoZone
  );
  if (rampRow) {
    result["rampants"] = applyFormula(rampRow, categorieRevenus) * valeur;
  }

  const comblesRow = CEE_DATA.find(r =>
    r.c === "combles perdus" && r.geo === geoZone
  );
  if (comblesRow) {
    result["combles perdus"] = applyFormula(comblesRow, categorieRevenus) * valeur;
  }

  const mursRow = CEE_DATA.find(r => r.c === "murs" && r.geo === geoZone);
  if (mursRow) {
    result.murs = applyFormula(mursRow, categorieRevenus) * valeur;
  }

  const plancherRow = CEE_DATA.find(r => r.c === "plancher" && r.geo === geoZone);
  if (plancherRow) {
    result.plancher = applyFormula(plancherRow, categorieRevenus) * valeur;
  }

  // ── toiture terrasses — × valeur (m²) ────────────────────────────────────
  const ttRow = CEE_DATA.find(r =>
    r.c === "toiture terrasses" && r.geo === geoZone
  );
  if (ttRow) {
    result["toiture terrasses"] = applyFormula(ttRow, categorieRevenus) * valeur;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Variante unitaire — utilisée par le simulateur (formulaire web)
// ---------------------------------------------------------------------------

/**
 * Calcule la prime CEE unitaire pour un type de travail donné.
 *
 * @param {string}  travail       Nom du travail (clé de CEE_DATA)
 * @param {Object}  opts
 * @param {string}  opts.postalCode
 * @param {string}  opts.housingType   "maison" | "appartement"
 * @param {string}  opts.heatingBefore "bois" | "electricite" | "fioul" | "gaz"
 * @param {'tres_modeste'|'modeste'|'intermediaire'|'superieur'} [opts.categorieRevenus]
 * @param {number}  [opts.surface_m2]
 * @param {number}  [opts.valeur=1]
 * @returns {number|null}
 */
function calculateCEEPrime(travail, { postalCode, housingType, heatingBefore, surface_m2, valeur = 1, categorieRevenus }) {
  const geoZone = getZoneCEE(postalCode);
  const housing = (housingType   || "").toLowerCase();
  const heating = (heatingBefore || "").toLowerCase();

  let row;

  switch (travail) {
    case "chauffe eau solaire combiné":
      row = CEE_DATA.find(r => r.c === travail && r.geo === geoZone && r.heating === heating);
      return row ? applyFormula(row, categorieRevenus) : null;

    case "chauffe eau solaire individuel":
      row = CEE_DATA.find(r => r.c === travail && r.geo === geoZone);
      return row ? applyFormula(row, categorieRevenus) : null;

    case "chauffe eau thermo":
      row = CEE_DATA.find(r => r.c === travail && r.housing === housing);
      return row ? applyFormula(row, categorieRevenus) : null;

    case "double flux": {
      if (surface_m2 === undefined || surface_m2 === null) return null;
      const slot = getSurfaceSlotDoubleFlux(surface_m2);
      row = CEE_DATA.find(r => r.c === travail && r.geo === geoZone && r.surfaceSlot === slot);
      return row ? applyFormula(row, categorieRevenus) : null;
    }

    case "vmc simple flux": {
      if (surface_m2 === undefined || surface_m2 === null) return null;
      const slotVmc = getSurfaceSlotDoubleFlux(surface_m2);
      row = CEE_DATA.find(r => r.c === travail && r.geo === geoZone && r.surfaceSlot === slotVmc);
      return row ? applyFormula(row, categorieRevenus) : null;
    }

    case "pac air air": {
      if (surface_m2 === undefined || surface_m2 === null || !geoZone) return null;
      const slotPac = getSurfaceSlotDoubleFlux(surface_m2);
      row = CEE_DATA.find(r => r.c === travail && r.geo === geoZone && r.surfaceSlot === slotPac);
      return row ? applyFormula(row, categorieRevenus) : null;
    }

    case "pac air eau": {
      if (surface_m2 === undefined || surface_m2 === null || !geoZone) return null;
      const slotPac = getSurfaceSlotPacAirEau(surface_m2, housingType);
      if (!slotPac) return null;
      row = CEE_DATA.find(r =>
        r.c === travail &&
        r.housing === housing &&
        r.geo === geoZone &&
        r.surfaceSlot === slotPac &&
        r.heating === heating
      );
      return row ? applyFormula(row, categorieRevenus) : null;
    }

    case "menuiseries":
    case "rampants":
    case "combles perdus":
    case "murs":
    case "toiture terrasses":
      row = CEE_DATA.find(r => r.c === travail && r.geo === geoZone);
      return row ? applyFormula(row, categorieRevenus) * valeur : null;

    case "plancher":
      row = CEE_DATA.find(r => r.c === travail && r.geo === geoZone);
      return row ? applyFormula(row, categorieRevenus) * valeur : null;

    case "poele buches":
    case "poele granules":
    case "foyer ferme":
      row = CEE_DATA.find(r => r.c === travail && r.geo === geoZone);
      return row ? applyFormula(row, categorieRevenus) : null;

    default:
      return null;
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    zoneByDept,
    getZoneCEE,
    CEE_DATA,
    getSurfaceSlotDoubleFlux,
    getSurfaceSlotPacAirEau,
    effectiveMkwh,
    effectiveKwh,
    applyFormula,
    calculateCEEPrimes,
    calculateCEEPrime,
  };
}
