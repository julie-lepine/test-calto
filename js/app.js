/**
 * Simulateur de primes rénovation énergétique (frontend pur)
 * ---------------------------------------------------------------------------
 * Ce fichier assemble l’interface : barèmes MPR et plafonds dans ce fichier ;
 * calculs CEE dans `js/calculators/cee-calculator.js` (chargé avant ce script).
 * 1. Plafonds et catégorie de revenus (Île-de-France / autres régions)
 * 2. Code postal → région (Île-de-France vs autres)
 * 3. Calcul MaPrimeRénov’ (montant d’aide) et branchement calculateCEEPrime (CEE)
 * 4. Animation de progression et affichage du résultat
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

/** Valeurs possibles du champ #income (fourchettes ANAH). */
const INCOME_CATEGORY_VALUES = ["tres_modeste", "modeste", "intermediaire", "superieur"];

// ---------------------------------------------------------------------------
// 1b. Code postal → région (Île-de-France vs autres)
// ---------------------------------------------------------------------------

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
  "chaudieres biomasse",
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

/** Familles de travaux → valeurs `option` du sélecteur maître (entonnoir projet). */
const WORK_TYPE_CATEGORIES = [
  {
    id: "isolations",
    label: "Isolations",
    workTypes: ["rampants", "toiture terrasses", "combles perdus", "murs", "plancher", "menuiseries"],
  },
  {
    id: "chauffage",
    label: "Chauffage",
    subcategories: [
      {
        id: "pac",
        label: "Pompes à chaleur",
        workTypes: ["pac air eau", "pac air air", "pac geo"],
      },
      {
        id: "chaudieres-biomasse",
        label: "Chaudière biomasse",
        workTypes: ["chaudieres biomasse"],
      },
      {
        id: "chauffe-eau",
        label: "Chauffe-eau",
        workTypes: [
          "chauffe eau thermo",
          "chauffe eau solaire individuel",
          "chauffe eau solaire combiné",
        ],
      },
      {
        id: "cuve-fioul",
        label: "Dépose de cuve à fioul",
        workTypes: ["cuve fioul"],
      },
    ],
  },
  {
    id: "foyer-bois",
    label: "Foyer & bois",
    workTypes: ["poele buches", "poele granules", "foyer ferme"],
  },
  {
    id: "ventilation",
    label: "Ventilation",
    workTypes: ["vmc simple flux", "double flux"],
  },
];

function getWorkTypeCategoryById(categoryId) {
  return WORK_TYPE_CATEGORIES.find(function (c) {
    return c.id === categoryId;
  });
}

function categoryUsesSubcategories(cat) {
  return Boolean(cat && Array.isArray(cat.subcategories) && cat.subcategories.length > 0);
}

function getWorkTypeSubcategory(categoryId, subcategoryId) {
  const cat = getWorkTypeCategoryById(categoryId);
  if (!categoryUsesSubcategories(cat)) return null;
  return (
    cat.subcategories.find(function (s) {
      return s.id === subcategoryId;
    }) || null
  );
}

function getWorkTypesForFunnelStep(categoryId, subcategoryId) {
  const cat = getWorkTypeCategoryById(categoryId);
  if (!cat) return [];
  if (subcategoryId) {
    const sub = getWorkTypeSubcategory(categoryId, subcategoryId);
    return sub ? sub.workTypes.slice() : [];
  }
  if (categoryUsesSubcategories(cat)) return [];
  return (cat.workTypes || []).slice();
}

function setProjectFunnelTypesStepVisible(row, visible) {
  const step = row.querySelector(".project-funnel__types-step");
  if (!step) return;
  step.hidden = !visible;
  step.setAttribute("aria-hidden", visible ? "false" : "true");
}

function setProjectFunnelSubcategoriesVisible(row, visible) {
  const panel = row.querySelector(".project-funnel__subcategories");
  if (!panel) return;
  panel.hidden = !visible;
  panel.setAttribute("aria-hidden", visible ? "false" : "true");
}

function getWorkTypeDisplayLabel(value) {
  return WORK_TYPE_LABELS[value] || value;
}

/** Âge minimum du logement (années) pour être pris en compte comme éligible MaPrimeRénov’ dans ce simulateur. */
const MAPRIME_AGE_MIN_LOGEMENT = 15;

/** Statuts pour lesquels aucune prime MaPrimeRénov’ n’est calculée. */
const MAPRIME_STATUTS_EXCLUS = {
  autre: "Autre statut : non éligible à MaPrimeRénov’.",
};

const HOUSING_LABELS = { maison: "Maison", appartement: "Appartement" };
const STATUS_LABELS = {
  occupant: "Propriétaire occupant",
  bailleur: "Propriétaire bailleur",
  autre: "Autre statut",
};
const HEATING_LABELS = {
  bois: "Bois",
  electricite: "Électricité",
  fioul: "Fioul",
  gaz: "Gaz",
};

/** @type {object|null} Contexte simulation + résultats après « Lancer la simulation ». */
let pendingSimulation = null;

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
const leadPanel = document.getElementById("lead-panel");
const leadForm = document.getElementById("lead-form");
const leadSubmitBtn = document.getElementById("lead-submit-btn");
const leadBackBtn = document.getElementById("lead-back-btn");
const leadConsentBlockedPanel = document.getElementById("lead-consent-blocked-panel");
const leadConsentBackBtn = document.getElementById("lead-consent-back-btn");
const leadConsentEditSimBtn = document.getElementById("lead-consent-edit-sim-btn");
const leadSendError = document.getElementById("err-lead-send");
const resultPanel = document.getElementById("result-panel");
const resultBackWrap = document.getElementById("result-back-wrap");
const resultBackBtn = document.getElementById("result-back-btn");
const resultCategory = document.getElementById("result-category");
const resultSurface = document.getElementById("result-surface");
const resultConstruction = document.getElementById("result-construction");
const resultTotalAmount = document.getElementById("result-total-amount");
const resultBlocage = document.getElementById("result-blocage");
const resultBreakdown = document.getElementById("result-breakdown");
const postalInput = document.getElementById("postalCode");
const regionInput = document.getElementById("region");
const householdInput = document.getElementById("household");
const incomeSelect = document.getElementById("income");
const incomeHint = document.getElementById("income-hint");

const INCOME_HINT_DEFAULT =
  "Indiquez d’abord le code postal (5 chiffres) et le nombre de personnes du foyer.";

function setIncomePlaceholderOption() {
  const opt = document.createElement("option");
  opt.value = "";
  opt.textContent = "—";
  incomeSelect.appendChild(opt);
}

function setIncomeHint(text) {
  if (!incomeHint) return;
  if (text) {
    incomeHint.textContent = text;
    incomeHint.hidden = false;
  } else {
    incomeHint.textContent = "";
    incomeHint.hidden = true;
  }
}

/** Ordre de focus en cas d’erreurs multiples (messages sous chaque champ). */
const ERROR_FIELD_IDS = [
  "housingType",
  "status",
  "constructionYear",
  "surfaceARenover",
  "postalCode",
  "city",
  "household",
  "income",
  "heatingBefore",
];

const LEAD_ERROR_FIELD_IDS = ["leadLastName", "leadFirstName", "leadEmail", "leadPhone"];

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
  LEAD_ERROR_FIELD_IDS.forEach(function (id) {
    const err = document.getElementById("err-" + id);
    if (err) {
      err.textContent = "";
      err.hidden = true;
    }
    const el = document.getElementById(id);
    if (el) el.removeAttribute("aria-invalid");
  });
  if (leadSendError) {
    leadSendError.textContent = "";
    leadSendError.hidden = true;
  }
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

function clearProjectFunnelInvalid(row) {
  row.querySelectorAll(".project-funnel__pill[aria-invalid]").forEach(function (btn) {
    btn.removeAttribute("aria-invalid");
  });
}

function clearRowProjectError(row, field) {
  const sel = field === "workType" ? ".project-err-workType" : ".project-err-quantity";
  const err = row.querySelector(sel);
  if (err) {
    err.textContent = "";
    err.hidden = true;
  }
  if (field === "workType") {
    clearProjectFunnelInvalid(row);
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
  if (field === "workType") {
    const categoryId = row.dataset.selectedCategory;
    const cat = categoryId ? getWorkTypeCategoryById(categoryId) : null;
    let focusTarget = row.querySelector(".project-funnel__category-btn");
    if (categoryId && cat && categoryUsesSubcategories(cat) && !row.dataset.selectedSubcategory) {
      focusTarget =
        row.querySelector(".project-funnel__subcategory-btn:not([aria-pressed='true'])") ||
        row.querySelector(".project-funnel__subcategory-btn");
    } else if (categoryId) {
      focusTarget =
        row.querySelector(".project-funnel__type-btn:not([aria-pressed='true'])") ||
        row.querySelector(".project-funnel__type-btn");
    }
    if (focusTarget) focusTarget.setAttribute("aria-invalid", "true");
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
  const formEl =
    leadPanel && !leadPanel.hidden && leadForm ? leadForm : document.getElementById("simulation-form");
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
      const categoryId = row.dataset.selectedCategory;
      const cat = categoryId ? getWorkTypeCategoryById(categoryId) : null;
      let funnelFocus = row.querySelector(".project-funnel__category-btn");
      if (categoryId && cat && categoryUsesSubcategories(cat) && !row.dataset.selectedSubcategory) {
        funnelFocus = row.querySelector(".project-funnel__subcategory-btn");
      } else if (categoryId) {
        funnelFocus = row.querySelector(".project-funnel__type-btn");
      }
      funnelFocus?.focus({ preventScroll: true });
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
  const qtyHint = row.querySelector(".project-quantity-hint");
  const needsQuantity = Boolean(workValue) && kind !== null;

  function hideQuantityField() {
    wrap.hidden = true;
    wrap.setAttribute("aria-hidden", "true");
    qtyInput.hidden = true;
    qtyInput.required = false;
    qtyInput.disabled = true;
    qtyInput.value = "";
    qtyInput.removeAttribute("aria-label");
    qtyInput.placeholder = "";
    qtyHint.textContent = "";
    clearRowProjectError(row, "quantity");
    qtyInput.removeAttribute("aria-invalid");
  }

  if (!needsQuantity) {
    hideQuantityField();
    return;
  }

  wrap.hidden = false;
  wrap.setAttribute("aria-hidden", "false");
  qtyInput.hidden = false;
  qtyInput.required = true;
  qtyInput.disabled = false;
  qtyInput.min = "1";
  qtyInput.step = "1";

  if (kind === "surface_m2") {
    qtyInput.setAttribute("aria-label", "Surface en m²");
    qtyHint.textContent = "";
    qtyInput.placeholder = "Surface en m² — ex. 95";
  } else {
    qtyInput.setAttribute("aria-label", "Nombre d’ouvrants");
    qtyHint.textContent = "Nombre de fenêtres et porte-fenêtres remplacées.";
    qtyInput.placeholder = "Nombre d’ouvrants — ex. 8";
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

function renderProjectSubcategoryButtons(row, categoryId) {
  const cat = getWorkTypeCategoryById(categoryId);
  const grid = row.querySelector(".project-funnel__subcategories-grid");
  if (!grid || !cat || !categoryUsesSubcategories(cat)) return;
  grid.replaceChildren();
  cat.subcategories.forEach(function (sub) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "project-funnel__pill project-funnel__subcategory-btn";
    btn.textContent = sub.label;
    btn.dataset.subcategory = sub.id;
    btn.setAttribute("aria-pressed", "false");
    btn.addEventListener("click", function () {
      selectProjectSubcategory(row, categoryId, sub.id);
    });
    grid.appendChild(btn);
  });
}

function renderProjectTypeButtons(row, categoryId, subcategoryId) {
  const grid = row.querySelector(".project-funnel__types-grid");
  if (!grid) return;
  const workTypes = getWorkTypesForFunnelStep(categoryId, subcategoryId);
  grid.replaceChildren();
  workTypes.forEach(function (workValue) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "project-funnel__pill project-funnel__type-btn";
    btn.textContent = getWorkTypeDisplayLabel(workValue);
    btn.dataset.workType = workValue;
    btn.setAttribute("aria-pressed", "false");
    btn.addEventListener("click", function () {
      selectProjectWorkType(row, workValue);
    });
    grid.appendChild(btn);
  });
}

function selectProjectCategory(row, categoryId) {
  const cat = getWorkTypeCategoryById(categoryId);
  if (!cat) return;

  row.dataset.selectedCategory = categoryId;
  delete row.dataset.selectedSubcategory;
  clearRowProjectError(row, "workType");

  row.querySelectorAll(".project-funnel__category-btn").forEach(function (btn) {
    const selected = btn.dataset.category === categoryId;
    btn.setAttribute("aria-pressed", selected ? "true" : "false");
  });

  row.querySelectorAll(".project-funnel__subcategory-btn").forEach(function (btn) {
    btn.setAttribute("aria-pressed", "false");
  });

  const workSel = row.querySelector(".project-work-type");
  if (workSel) {
    workSel.value = "";
    workSel.dispatchEvent(new Event("change", { bubbles: true }));
  }

  row.querySelectorAll(".project-funnel__type-btn").forEach(function (btn) {
    btn.setAttribute("aria-pressed", "false");
  });

  const typesPanel = row.querySelector(".project-funnel__types");
  if (typesPanel) {
    typesPanel.hidden = false;
    typesPanel.setAttribute("aria-hidden", "false");
  }

  if (categoryUsesSubcategories(cat)) {
    setProjectFunnelSubcategoriesVisible(row, true);
    renderProjectSubcategoryButtons(row, categoryId);
    setProjectFunnelTypesStepVisible(row, false);
    renderProjectTypeButtons(row, categoryId, null);
  } else {
    setProjectFunnelSubcategoriesVisible(row, false);
    setProjectFunnelTypesStepVisible(row, true);
    renderProjectTypeButtons(row, categoryId, null);
  }

  updateQuantityForRow(row);
}

function selectProjectSubcategory(row, categoryId, subcategoryId) {
  const sub = getWorkTypeSubcategory(categoryId, subcategoryId);
  if (!sub) return;

  row.dataset.selectedSubcategory = subcategoryId;
  clearRowProjectError(row, "workType");

  row.querySelectorAll(".project-funnel__subcategory-btn").forEach(function (btn) {
    btn.setAttribute("aria-pressed", btn.dataset.subcategory === subcategoryId ? "true" : "false");
  });

  row.querySelectorAll(".project-funnel__type-btn").forEach(function (btn) {
    btn.setAttribute("aria-pressed", "false");
  });

  const grid = row.querySelector(".project-funnel__types-grid");
  if (grid) grid.replaceChildren();

  if (sub.workTypes.length === 1) {
    setProjectFunnelTypesStepVisible(row, false);
    selectProjectWorkType(row, sub.workTypes[0]);
    return;
  }

  const workSel = row.querySelector(".project-work-type");
  if (workSel) {
    workSel.value = "";
    workSel.dispatchEvent(new Event("change", { bubbles: true }));
  }

  setProjectFunnelTypesStepVisible(row, true);
  renderProjectTypeButtons(row, categoryId, subcategoryId);
  updateQuantityForRow(row);
}

function selectProjectWorkType(row, workValue) {
  const workSel = row.querySelector(".project-work-type");
  if (!workSel || workSel.value === workValue) {
    if (workSel && workSel.value === workValue) updateQuantityForRow(row);
    return;
  }

  workSel.value = workValue;
  clearRowProjectError(row, "workType");

  row.querySelectorAll(".project-funnel__type-btn").forEach(function (btn) {
    btn.setAttribute("aria-pressed", btn.dataset.workType === workValue ? "true" : "false");
  });

  workSel.dispatchEvent(new Event("change", { bubbles: true }));
  updateQuantityForRow(row);
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

  const funnel = document.createElement("div");
  funnel.className = "field field--full project-funnel";

  const catLabel = document.createElement("span");
  catLabel.className = "field__label";
  catLabel.textContent = "Famille de travaux";

  const catGroup = document.createElement("div");
  catGroup.className = "project-funnel__categories";
  catGroup.setAttribute("role", "group");
  catGroup.setAttribute("aria-label", "Famille de travaux");

  WORK_TYPE_CATEGORIES.forEach(function (cat) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "project-funnel__pill project-funnel__category-btn";
    btn.textContent = cat.label;
    btn.dataset.category = cat.id;
    btn.setAttribute("aria-pressed", "false");
    btn.addEventListener("click", function () {
      selectProjectCategory(row, cat.id);
    });
    catGroup.appendChild(btn);
  });

  const typesPanel = document.createElement("div");
  typesPanel.className = "project-funnel__types";
  typesPanel.hidden = true;
  typesPanel.setAttribute("aria-hidden", "true");

  const subPanel = document.createElement("div");
  subPanel.className = "project-funnel__subcategories";
  subPanel.hidden = true;
  subPanel.setAttribute("aria-hidden", "true");

  const subLabel = document.createElement("span");
  subLabel.className = "field__label";
  subLabel.textContent = "Type d'équipement";

  const subGrid = document.createElement("div");
  subGrid.className = "project-funnel__subcategories-grid";
  subGrid.setAttribute("role", "group");
  subGrid.setAttribute("aria-label", "Type d'équipement");

  subPanel.appendChild(subLabel);
  subPanel.appendChild(subGrid);

  const typesStep = document.createElement("div");
  typesStep.className = "project-funnel__types-step";
  typesStep.hidden = true;
  typesStep.setAttribute("aria-hidden", "true");

  const typesLabel = document.createElement("span");
  typesLabel.className = "field__label";
  typesLabel.textContent = "Projet concerné";

  const typesGrid = document.createElement("div");
  typesGrid.className = "project-funnel__types-grid";
  typesGrid.setAttribute("role", "group");
  typesGrid.setAttribute("aria-label", "Projet concerné");

  typesStep.appendChild(typesLabel);
  typesStep.appendChild(typesGrid);

  typesPanel.appendChild(subPanel);
  typesPanel.appendChild(typesStep);

  const workSel = workTypeMaster.cloneNode(true);
  workSel.disabled = false;
  workSel.hidden = true;
  workSel.removeAttribute("id");
  workSel.setAttribute("aria-hidden", "true");
  workSel.setAttribute("tabindex", "-1");
  workSel.name = "workType[]";
  workSel.className = "project-work-type work-type-master";
  workSel.required = true;
  workSel.value = "";

  const errWork = document.createElement("span");
  errWork.className = "field__error project-err-workType";
  errWork.hidden = true;

  funnel.appendChild(catLabel);
  funnel.appendChild(catGroup);
  funnel.appendChild(typesPanel);
  funnel.appendChild(workSel);
  funnel.appendChild(errWork);

  workSel.addEventListener("change", function () {
    updateQuantityForRow(row);
  });

  const qtyWrap = document.createElement("div");
  qtyWrap.className = "field field--full project-quantity-wrap";
  qtyWrap.hidden = true;
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
  qtyWrap.appendChild(qtyInput);
  qtyWrap.appendChild(errQty);
  qtyWrap.appendChild(qtyHint);

  row.appendChild(head);
  row.appendChild(funnel);
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
  updateIncomeSelectOptions();
}

/**
 * Remplit #income avec les 4 fourchettes ANAH (montants selon CP et taille du foyer).
 */
function updateIncomeSelectOptions() {
  const prev = incomeSelect.value;
  const cp = normalizePostalDigits(postalInput.value);
  const household = Math.floor(Number(householdInput.value));

  incomeSelect.innerHTML = "";

  if (!/^\d{5}$/.test(cp)) {
    setIncomePlaceholderOption();
    incomeSelect.disabled = true;
    setIncomeHint(INCOME_HINT_DEFAULT);
    return;
  }

  if (!household || household < 1 || household > 20) {
    setIncomePlaceholderOption();
    incomeSelect.disabled = true;
    setIncomeHint("Indiquez le nombre de personnes du foyer (1 à 20).");
    return;
  }

  const regionKind = deriveRegionFromPostalCode(cp);
  if (!regionKind) {
    setIncomePlaceholderOption();
    incomeSelect.disabled = true;
    setIncomeHint("Code postal invalide pour le barème des revenus.");
    return;
  }

  setIncomeHint("");

  const ileDeFrance = regionKind === "idf";
  const { plafondTM, plafondM, plafondI } = getPlafondsRevenus(household, ileDeFrance);

  const defs = [
    {
      value: "tres_modeste",
      label: "Jusqu’à " + formatEuros(plafondTM),
    },
    {
      value: "modeste",
      label: "De " + formatEuros(plafondTM) + " à " + formatEuros(plafondM),
    },
    {
      value: "intermediaire",
      label: "De " + formatEuros(plafondM) + " à " + formatEuros(plafondI),
    },
    {
      value: "superieur",
      label: "Plus de " + formatEuros(plafondI),
    },
  ];

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "—";
  incomeSelect.appendChild(placeholder);

  defs.forEach(function (d) {
    const opt = document.createElement("option");
    opt.value = d.value;
    opt.textContent = d.label;
    incomeSelect.appendChild(opt);
  });

  incomeSelect.disabled = false;
  if (INCOME_CATEGORY_VALUES.includes(prev)) {
    incomeSelect.value = prev;
  }
}

postalInput.addEventListener("input", syncRegionFromPostal);
postalInput.addEventListener("blur", syncRegionFromPostal);
householdInput.addEventListener("input", updateIncomeSelectOptions);

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

function getMaprimeLineForProject(p, categorie, maprimeBloquee) {
  if (maprimeBloquee) {
    return { text: "Non éligible", amount: 0, eligible: false };
  }
  const aide = calculerAideMPR(categorie, p.workType, p.valeur);
  if (!aide.eligible) {
    return { text: "Non éligible", amount: 0, eligible: false };
  }
  return { text: formatEuros(aide.montant), amount: aide.montant, eligible: true };
}

function getCEELineForProject(p, categorie, opts) {
  const { ceeBloquee, housingTypeVal, heatingBeforeVal, surfaceARenover, postal } = opts;
  if (ceeBloquee) {
    return { text: "Non éligible", amount: 0, eligible: false };
  }
  if (!getZoneCEE(postal)) {
    return { text: "Non éligible", amount: 0, eligible: false };
  }
  const needsSurfaceForCEE =
    p.workType === "double flux" ||
    p.workType === "vmc simple flux" ||
    p.workType === "pac air air" ||
    p.workType === "pac air eau";
  const surface_m2ForCEE = needsSurfaceForCEE ? surfaceARenover : undefined;
  const valeurForCEE = needsSurfaceForCEE ? 1 : p.valeur || 1;
  const prime = calculateCEEPrime(p.workType, {
    postalCode: postal,
    housingType: housingTypeVal,
    heatingBefore: heatingBeforeVal,
    surface_m2: surface_m2ForCEE,
    valeur: valeurForCEE,
    categorieRevenus: categorie,
  });
  if (prime === null || prime <= 0) {
    return { text: "Non éligible", amount: 0, eligible: false };
  }
  return { text: formatEuros(prime), amount: prime, eligible: true };
}

function appendResultLine(container, label, line) {
  const row = document.createElement("div");
  row.className = "result-line";
  const lab = document.createElement("span");
  lab.className = "result-line__label";
  lab.textContent = label;
  const val = document.createElement("strong");
  val.className = "result-line__value";
  val.textContent = line.text;
  if (!line.eligible) {
    val.classList.add("result-line__value--ineligible");
  }
  row.appendChild(lab);
  row.appendChild(val);
  container.appendChild(row);
}

function renderUnifiedResultBreakdown(projets, categorie, opts) {
  const maprimeBloquee = opts.maprimeBloquee;
  const ceeOpts = {
    ceeBloquee: opts.ceeBloquee,
    housingTypeVal: opts.housingTypeVal,
    heatingBeforeVal: opts.heatingBeforeVal,
    surfaceARenover: opts.surfaceARenover,
    postal: opts.postal,
  };

  if (resultBreakdown) resultBreakdown.textContent = "";

  let totalPrime = 0;
  let maprimeTotal = 0;
  let anyComputed = false;
  let anyEligible = false;

  projets.forEach(function (p) {
    const nomProduit = WORK_TYPE_LABELS[p.workType] || p.workType;
    const maprimeLine = getMaprimeLineForProject(p, categorie, maprimeBloquee);
    const ceeLine = getCEELineForProject(p, categorie, ceeOpts);

    if (maprimeLine.eligible) {
      maprimeTotal += maprimeLine.amount;
      anyEligible = true;
    }
    if (ceeLine.eligible) {
      totalPrime += ceeLine.amount;
      anyComputed = true;
      anyEligible = true;
    }

    const article = document.createElement("article");
    article.className = "result-project";

    const title = document.createElement("h4");
    title.className = "result-project__title";
    title.textContent = nomProduit + " :";
    article.appendChild(title);

    const lines = document.createElement("div");
    lines.className = "result-project__lines";
    appendResultLine(lines, "MaPrimeRénov’", maprimeLine);
    appendResultLine(lines, "CEE", ceeLine);
    article.appendChild(lines);

    if (resultBreakdown) resultBreakdown.appendChild(article);
  });

  return {
    totalPrime: totalPrime,
    anyComputed: anyComputed,
    maprimeTotal: maprimeTotal,
    anyEligible: anyEligible,
  };
}

function computeCEETotals(projets, categorie, opts) {
  let totalPrime = 0;
  let anyComputed = false;
  projets.forEach(function (p) {
    const line = getCEELineForProject(p, categorie, opts);
    if (line.eligible) {
      totalPrime += line.amount;
      anyComputed = true;
    }
  });
  return { totalPrime: totalPrime, anyComputed: anyComputed };
}

/** Compatibilité : calcule les totaux CEE sans ré-afficher le détail. */
function renderCEEBreakdown(projets, categorie, opts) {
  return computeCEETotals(projets, categorie, opts);
}

/**
 * Génère le texte de détail affiché sous le montant CEE.
 */
function buildCEEDetailText(workType, prime, zone, valeur, surface_m2) {
  const zoneLabel = zone ? " (zone " + zone + ")" : "";
  if (workType === "double flux") {
    return "VMC double flux" + zoneLabel + " — surface " + surface_m2 + " m² : prime estimée " + formatEuros(prime) + ".";
  }
  if (workType === "vmc simple flux") {
    return (WORK_TYPE_LABELS[workType] || workType) + zoneLabel + " — surface " + surface_m2 + " m² : prime estimée " + formatEuros(prime) + ".";
  }
  if (workType === "pac air air" || workType === "pac air eau") {
    return (WORK_TYPE_LABELS[workType] || workType) + zoneLabel + " — surface " + surface_m2 + " m² : prime estimée " + formatEuros(prime) + ".";
  }
  if (workType === "menuiseries") {
    return "Menuiseries" + zoneLabel + " — " + valeur + " ouvrant(s) : prime estimée " + formatEuros(prime) + ".";
  }
  if (
    workType === "rampants" ||
    workType === "toiture terrasses" ||
    workType === "combles perdus" ||
    workType === "murs" ||
    workType === "plancher"
  ) {
    return (WORK_TYPE_LABELS[workType] || workType) + zoneLabel + " — " + valeur + " m² : prime estimée " + formatEuros(prime) + ".";
  }
  return (WORK_TYPE_LABELS[workType] || workType) + zoneLabel + " : prime estimée " + formatEuros(prime) + ".";
}

function getSelectLabel(selectId) {
  const el = document.getElementById(selectId);
  if (!el || el.selectedIndex < 0) return "";
  const opt = el.options[el.selectedIndex];
  return opt ? opt.textContent.trim() : "";
}

/**
 * @param {object} ctx
 * @returns {object} Résultats calculés pour affichage et e-mail lead.
 */
function computeSimulationResults(ctx) {
  const categorie = ctx.categorie;
  const ageLogement = getAgeLogementAnnees(ctx.constructionYear);
  const messagesBlocage = [];
  let maprimeBloquee = false;

  if (MAPRIME_STATUTS_EXCLUS[ctx.statusVal]) {
    maprimeBloquee = true;
    messagesBlocage.push(MAPRIME_STATUTS_EXCLUS[ctx.statusVal]);
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
    ctx.projets.forEach(function (p) {
      const aide = calculerAideMPR(categorie, p.workType, p.valeur);
      if (aide.eligible) {
        totalMontant += aide.montant;
        anyEligible = true;
      }
    });
  }

  return {
    categorie,
    ageLogement,
    messagesBlocage,
    maprimeBloquee,
    ceeBloquee,
    totalMontant,
    anyEligible,
  };
}

function applySimulationResultsToDom(ctx, results) {
  const categorie = results.categorie;
  const ageLogement = results.ageLogement;

  resultPanel.hidden = false;

  if (results.messagesBlocage.length) {
    resultBlocage.textContent = results.messagesBlocage.join(" ");
    resultBlocage.hidden = false;
  } else {
    resultBlocage.textContent = "";
    resultBlocage.hidden = true;
  }

  if (resultCategory) {
    resultCategory.textContent = "Catégorie de revenus : " + CATEGORY_LABELS[categorie];
  }
  if (resultSurface) {
    resultSurface.textContent =
      "Surface du logement à rénover : " + formatSurfaceM2(ctx.surfaceRenover) + " m²";
  }
  if (resultConstruction) {
    resultConstruction.textContent =
      "Année de construction : " +
      ctx.constructionYear +
      " (environ " +
      ageLogement +
      " an" +
      (ageLogement > 1 ? "s" : "") +
      ")";
  }

  const breakdownRes = renderUnifiedResultBreakdown(ctx.projets, categorie, {
    maprimeBloquee: results.maprimeBloquee,
    ceeBloquee: results.ceeBloquee,
    housingTypeVal: ctx.housingTypeVal,
    heatingBeforeVal: ctx.heatingBeforeVal,
    surfaceARenover: ctx.surfaceRenover,
    postal: ctx.postal,
  });

  const grandTotal = breakdownRes.maprimeTotal + breakdownRes.totalPrime;
  const showTotal = breakdownRes.anyEligible && grandTotal > 0;

  resultPanel.classList.toggle("result--ineligible", !showTotal);

  if (resultTotalAmount) {
    resultTotalAmount.textContent = showTotal ? formatEuros(grandTotal) : "Non éligible";
  }

  results.ceeRes = {
    totalPrime: breakdownRes.totalPrime,
    anyComputed: breakdownRes.anyComputed,
  };
  results.grandTotal = grandTotal;

  return results.ceeRes;
}

function buildLeadSimulationSummary(ctx, results) {
  const ceeRes = results.ceeRes;
  const maprimeLabel =
    results.maprimeBloquee || !results.anyEligible
      ? "Non éligible"
      : formatEuros(results.totalMontant);
  const ceeLabel =
    ceeRes && ceeRes.anyComputed && Number.isFinite(ceeRes.totalPrime) && ceeRes.totalPrime > 0
      ? formatEuros(ceeRes.totalPrime)
      : "Non éligible";
  const grandTotal =
    (results.grandTotal != null ? results.grandTotal : 0) ||
    (results.anyEligible ? results.totalMontant : 0) +
      (ceeRes && ceeRes.anyComputed ? ceeRes.totalPrime : 0);

  const summaryRows = [
    { label: "Code postal", value: ctx.postal },
    { label: "Ville", value: ctx.cityLine },
    { label: "Personnes dans le foyer", value: ctx.household },
    { label: "Tranche de revenus", value: ctx.incomeLabel },
    { label: "Type de logement", value: HOUSING_LABELS[ctx.housingTypeVal] || ctx.housingTypeVal },
    { label: "Statut", value: STATUS_LABELS[ctx.statusVal] || ctx.statusVal },
    { label: "Année de construction", value: ctx.constructionYear },
    { label: "Surface à rénover (m²)", value: ctx.surfaceRenover },
    {
      label: "Chauffage avant travaux",
      value: HEATING_LABELS[ctx.heatingBeforeVal] || ctx.heatingBeforeVal,
    },
  ];

  const summaryLines = summaryRows.map(function (r) {
    return r.label + " : " + r.value;
  });

  const projectLines = ctx.projets.map(function (p, i) {
    const name = WORK_TYPE_LABELS[p.workType] || p.workType;
    const kind = getWorkTypeSaisie(p.workType);
    if (kind === "surface_m2") return name + " — " + p.valeur + " m²";
    if (kind === "nombre") return name + " — " + p.valeur + " ouvrant(s)";
    return name;
  });

  const resultRows = [
    { label: "Montant total des primes", value: grandTotal > 0 ? formatEuros(grandTotal) : "Non éligible" },
    { label: "Total MaPrimeRénov’ estimé", value: maprimeLabel },
    { label: "Total CEE estimé", value: ceeLabel },
  ];

  return {
    summaryRows: summaryRows,
    summaryLines: summaryLines,
    projectLines: projectLines,
    resultRows: resultRows,
    resultLines: resultRows.map(function (r) {
      return r.label + " : " + r.value;
    }),
  };
}

function showLeadPanel() {
  if (form) form.hidden = true;
  if (leadConsentBlockedPanel) leadConsentBlockedPanel.hidden = true;
  if (leadPanel) {
    leadPanel.hidden = false;
    leadPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  if (resultPanel) resultPanel.hidden = true;
  if (resultBackWrap) resultBackWrap.hidden = true;
}

function showLeadConsentBlockedPage() {
  if (leadPanel) leadPanel.hidden = true;
  if (form) form.hidden = true;
  if (resultPanel) resultPanel.hidden = true;
  if (leadConsentBlockedPanel) {
    leadConsentBlockedPanel.hidden = false;
    leadConsentBlockedPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

/** Affiche la page de résultats (après formulaire lead). */
function showResultsPage(ctx, results) {
  if (leadPanel) leadPanel.hidden = true;
  if (leadConsentBlockedPanel) leadConsentBlockedPanel.hidden = true;
  if (form) form.hidden = true;
  applySimulationResultsToDom(ctx, results);
  if (resultBackWrap) resultBackWrap.hidden = false;
  if (resultPanel) {
    resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function showSimulationFormAgain() {
  pendingSimulation = null;
  if (leadPanel) leadPanel.hidden = true;
  if (leadConsentBlockedPanel) leadConsentBlockedPanel.hidden = true;
  if (resultPanel) resultPanel.hidden = true;
  if (resultBackWrap) resultBackWrap.hidden = true;
  if (form) {
    form.hidden = false;
    form.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function validateSimulationForm(data) {
  const postal = normalizePostalDigits(data.get("postalCode"));
  const region = deriveRegionFromPostalCode(postal);
  const categorieRevenus = String(data.get("income") ?? "");
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

  if (data.get("household") === "" || Number.isNaN(household) || household < 1 || household > 20) {
    showFieldError("household", "Indiquez le nombre de personnes du foyer (1 à 20).");
    hasError = true;
  }

  if (!INCOME_CATEGORY_VALUES.includes(categorieRevenus)) {
    showFieldError("income", "Choisissez votre tranche de revenus.");
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

  const projets = [];
  projectRows.forEach(function (row) {
    const wt = row.querySelector(".project-work-type").value;
    const kind = getWorkTypeSaisie(wt);
    const qtyInput = row.querySelector(".project-quantity");
    const quantityRaw = qtyInput.value;
    const qVal = Number(quantityRaw);

    if (!wt) {
      const catId = row.dataset.selectedCategory;
      const cat = catId ? getWorkTypeCategoryById(catId) : null;
      let msg = "Choisissez une famille de travaux.";
      if (catId && cat && categoryUsesSubcategories(cat) && !row.dataset.selectedSubcategory) {
        msg = "Choisissez un type d'équipement.";
      } else if (catId) {
        msg = "Choisissez le projet concerné.";
      }
      showProjectRowError(row, "workType", msg);
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
    projets.push({ workType: wt, valeur: valeur });
  });

  if (hasError) {
    return { ok: false };
  }

  return {
    ok: true,
    ctx: {
      postal: postal,
      region: region,
      categorieRevenus: categorieRevenus,
      household: household,
      constructionYear: constructionYear,
      surfaceRenover: surfaceRenover,
      cityLine: cityLine,
      projets: projets,
      housingTypeVal: data.get("housingType"),
      heatingBeforeVal: data.get("heatingBefore"),
      statusVal: data.get("status"),
      incomeLabel: getSelectLabel("income"),
    },
  };
}

function validateLeadForm(data) {
  let hasError = false;
  const lastName = String(data.get("leadLastName") ?? "").trim();
  const firstName = String(data.get("leadFirstName") ?? "").trim();
  const email = String(data.get("leadEmail") ?? "").trim();
  const phone = String(data.get("leadPhone") ?? "").trim();

  if (!lastName) {
    showFieldError("leadLastName", "Indiquez votre nom.");
    hasError = true;
  }
  if (!firstName) {
    showFieldError("leadFirstName", "Indiquez votre prénom.");
    hasError = true;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showFieldError("leadEmail", "Indiquez une adresse e-mail valide.");
    hasError = true;
  }
  if (!phone || phone.replace(/\D/g, "").length < 10) {
    showFieldError("leadPhone", "Indiquez un numéro de téléphone valide.");
    hasError = true;
  }
  if (hasError) {
    return { ok: false };
  }

  return {
    ok: true,
    lead: {
      lastName: lastName,
      firstName: firstName,
      email: email,
      phone: phone,
      consent: true,
    },
  };
}

if (leadBackBtn) {
  leadBackBtn.addEventListener("click", function () {
    showSimulationFormAgain();
  });
}

if (resultBackBtn) {
  resultBackBtn.addEventListener("click", function () {
    showSimulationFormAgain();
  });
}

if (leadConsentBackBtn) {
  leadConsentBackBtn.addEventListener("click", function () {
    showLeadPanel();
  });
}

if (leadConsentEditSimBtn) {
  leadConsentEditSimBtn.addEventListener("click", function () {
    showSimulationFormAgain();
  });
}

if (leadForm) {
  leadForm.addEventListener("submit", function (e) {
    e.preventDefault();
    clearFieldErrors();

    if (!pendingSimulation) {
      if (leadSendError) {
        leadSendError.textContent = "Aucune simulation en cours. Relancez le calcul.";
        leadSendError.hidden = false;
      }
      return;
    }

    const data = new FormData(leadForm);

    if (!data.get("leadConsent")) {
      const leadCheckWithoutConsent = validateLeadForm(data);
      if (!leadCheckWithoutConsent.ok) {
        focusFirstInvalidField();
        return;
      }
      showLeadConsentBlockedPage();
      return;
    }

    const leadCheck = validateLeadForm(data);
    if (!leadCheck.ok) {
      focusFirstInvalidField();
      return;
    }

    const brand = window.SIMULATOR_BRAND || {};
    const simCtx = pendingSimulation.ctx;
    const simResults = pendingSimulation.results;

    if (!simResults.ceeRes) {
      simResults.ceeRes = computeCEETotals(simCtx.projets, simResults.categorie, {
        ceeBloquee: simResults.ceeBloquee,
        housingTypeVal: simCtx.housingTypeVal,
        heatingBeforeVal: simCtx.heatingBeforeVal,
        surfaceARenover: simCtx.surfaceRenover,
        postal: simCtx.postal,
      });
    }

    const snapshot = { ctx: simCtx, results: simResults };
    pendingSimulation = null;

    showResultsPage(snapshot.ctx, snapshot.results);

    const emailSummary = buildLeadSimulationSummary(snapshot.ctx, snapshot.results);
    const emailContent =
      typeof buildSimulatorLeadEmailContent === "function"
        ? buildSimulatorLeadEmailContent(brand, leadCheck.lead, emailSummary)
        : null;

    if (!emailContent || typeof sendSimulatorLeadNotification !== "function") {
      return;
    }

    sendSimulatorLeadNotification(brand, emailContent).catch(function (err) {
      if (resultBlocage) {
        const msg =
          (err && err.message ? err.message : "Notification lead non envoyée.") +
          " Vos résultats restent affichés ci-dessous.";
        resultBlocage.textContent = resultBlocage.textContent
          ? resultBlocage.textContent + " " + msg
          : msg;
        resultBlocage.hidden = false;
      }
    });
  });
}

form.addEventListener("submit", function (e) {
  e.preventDefault();

  clearFieldErrors();

  const data = new FormData(form);
  const check = validateSimulationForm(data);
  if (!check.ok) {
    focusFirstInvalidField();
    return;
  }

  syncRegionFromPostal();

  const ctx = Object.assign({}, check.ctx, { categorie: check.ctx.categorieRevenus });

  runProgressAnimation(function afterProgress() {
    const results = computeSimulationResults(ctx);
    pendingSimulation = { ctx: ctx, results: results };

    progressBar.style.width = "100%";
    window.setTimeout(function () {
      progressEl.hidden = true;
      progressEl.setAttribute("aria-hidden", "true");
      progressBar.style.width = "0%";
      submitBtn.disabled = false;
      showLeadPanel();
    }, 320);
  });
});