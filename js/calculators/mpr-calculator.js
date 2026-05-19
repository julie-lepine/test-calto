/**
 * MaPrimeRénov' — données et calculateur (plafonds ANAH, catégories de revenus, aides par travaux).
 * À mettre à jour lors des évolutions réglementaires.
 */

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

/** Valeurs possibles du champ #income (fourchettes ANAH). */
const INCOME_CATEGORY_VALUES = ["tres_modeste", "modeste", "intermediaire", "superieur"];

// ---------------------------------------------------------------------------
// Région barème ANAH (Île-de-France vs autres), à partir du département (CP)
// ---------------------------------------------------------------------------

/** Départements d'Île-de-France : préfixes des codes postaux à 5 chiffres. */
const IDF_DEPARTMENTS_PREFIX = ["75", "77", "78", "91", "92", "93", "94", "95"];

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
 * Plafonds annuels de RFR (grille ANAH : très modestes / modestes / intermédiaires).
 * @param {number} nbPersonnes
 * @param {boolean} ileDeFrance
 * @returns {{ plafondTM: number, plafondM: number, plafondI: number }}
 */
function getPlafondsRevenus(nbPersonnes, ileDeFrance) {
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
  return { plafondTM, plafondM, plafondI };
}

/**
 * Calcule la catégorie de revenus à partir du barème officiel simplifié.
 * @param {number} revenuFiscalRef - Revenu fiscal de référence annuel (€)
 * @param {number} nbPersonnes - Nombre de personnes du foyer (≥ 1)
 * @param {boolean} ileDeFrance - true si logement en Île-de-France
 * @returns {'tres_modeste'|'modeste'|'intermediaire'|'superieur'}
 */
function getCategorieRevenus(revenuFiscalRef, nbPersonnes, ileDeFrance) {
  const { plafondTM, plafondM, plafondI } = getPlafondsRevenus(nbPersonnes, ileDeFrance);
  if (revenuFiscalRef <= plafondTM) return "tres_modeste";
  if (revenuFiscalRef <= plafondM) return "modeste";
  if (revenuFiscalRef <= plafondI) return "intermediaire";
  return "superieur";
}
/** Âge minimum du logement (années) pour être pris en compte comme éligible MaPrimeRénov’ dans ce simulateur. */
const MAPRIME_AGE_MIN_LOGEMENT = 15;

/** Statuts pour lesquels aucune prime MaPrimeRénov’ n’est calculée. */
const MAPRIME_STATUTS_EXCLUS = {
  autres: "Non éligible à MaPrimeRénov’.",
};
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

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    THRESHOLDS_IDF,
    THRESHOLDS_AUTRES,
    CATEGORY_LABELS,
    INCOME_CATEGORY_VALUES,
    IDF_DEPARTMENTS_PREFIX,
    deriveRegionFromPostalCode,
    getPlafondsRevenus,
    getCategorieRevenus,
    MAPRIME_AGE_MIN_LOGEMENT,
    MAPRIME_STATUTS_EXCLUS,
    PLAFONDS,
    getTypologieClient,
    calculerAideMPR,
  };
}
