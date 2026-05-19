/**
 * Thème graphique centralisé (DEFAULT_CSS_VARS) + polices Web + textes/logo/CTA.
 * headerSubtitle passe par window.DOMPurify si disponible (script chargé avant celui-ci).
 * Surcharge : window.SIMULATOR_BRAND avant ce script dans <head> (voir BRAND.md).
 */

(function () {
  var DEFAULT_FONT_STYLESHEET_HREF =
    "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,700;1,9..40,400&family=Fraunces:opsz,wght@9..144,600&display=swap";

  var DEFAULT_CSS_VARS = {
    "--brand-primary": "#FBBA00",
    "--brand-primary-muted": "#FBBA00a8",
    "--brand-primary-hover": "#FBBA00",
    "--brand-primary-soft": "#FBBA0038",
    "--brand-on-primary": "#0a0f0d",
    "--brand-surface": "#ffffff",
    "--brand-text": "#000000",
    "--brand-text-muted": "#94a3b8",
    "--brand-danger": "#e07a6e",
    "--brand-danger-bg-soft": "rgba(224, 122, 110, 0.12)",
    "--brand-danger-border-strong": "rgba(224, 122, 110, 0.35)",
    "--brand-danger-focus-ring": "0 0 0 3px rgba(224, 122, 110, 0.2)",

    "--brand-radius": "12px",
    "--brand-control-radius": "8px",
    "--brand-control-radius-sm": "6px",
    "--brand-radius-pill": "999px",
    "--brand-shadow": "0 12px 40px rgba(0, 0, 0, 0.35)",
    "--brand-page-max-width": "640px",
    "--brand-header-logo-max-h": "88px",

    "--brand-header-background": "var(--brand-surface)",
    "--brand-header-text": "var(--brand-text)",
    "--brand-header-divider-color": "rgba(0, 0, 0, 0.08)",
    "--brand-divider-color": "rgba(0, 0, 0, 0.08)",
    "--brand-header-top-border-width": "3px",
    "--brand-header-top-border-color": "var(--brand-text)",
    "--brand-header-shadow": "0 6px 28px rgba(0, 0, 0, 0.06)",

    "--brand-bg-page": "#ffffff",
    "--brand-gradient-spot-1": "rgba(61, 154, 122, 0.12)",
    "--brand-gradient-spot-1-pos": "10% -20%",
    "--brand-gradient-spot-2": "rgba(100, 120, 200, 0.08)",
    "--brand-gradient-spot-2-pos": "100% 50%",
    "--brand-progress-end": "#6bc4a3",
    "--brand-progress-track-height": "6px",

    "--brand-font-sans": '"DM Sans", system-ui, sans-serif',
    "--brand-font-display": '"Fraunces", Georgia, serif',
    "--brand-title-page-size": "clamp(1.45rem, 4vw, 1.85rem)",
    "--brand-title-amount-size": "clamp(1.75rem, 5vw, 2.25rem)",

    "--brand-btn-primary-bg": "var(--brand-primary-muted)",
    "--brand-btn-primary-color": "var(--brand-on-primary)",
    "--brand-btn-primary-hover-bg": "var(--brand-primary-hover)",
    "--brand-btn-primary-hover-color": "var(--brand-on-primary)",
    "--brand-btn-secondary-bg": "transparent",
    "--brand-btn-secondary-color": "var(--brand-primary-hover)",
    "--brand-btn-secondary-border": "var(--brand-primary)",
    "--brand-btn-secondary-hover-bg": "var(--brand-primary-soft)",
    "--brand-btn-secondary-hover-color": "var(--brand-primary-hover)",
    "--brand-btn-secondary-hover-border": "var(--brand-primary-muted)"
  };

  var defaults = {
    /** Version du pack marque + pages (traçabilité déploiement partenaire). Surcharge possible via SIMULATOR_BRAND. */
    simulatorVersion: "1.0.0",

    fontStylesheetHref: DEFAULT_FONT_STYLESHEET_HREF,

    pageTitle: "Simulateur de primes travaux — PPF",
    headerTitle: "Simulateur de primes travaux — CEE et MaPrimeRénov’ (PPF)",
    headerSubtitle:
      "Estimation indicative pour les primes <strong>CEE</strong> et <strong>MaPrimeRénov’</strong> : vous pouvez saisir <strong>plusieurs projets de travaux</strong> (lots) ; le total affiché est la somme des aides estimées par projet, selon votre foyer et le code postal du logement.",
    footerText:
      "Total = somme des projets saisis ; en réalité CEE et MaPrimeRénov’ (parcours accompagné, cumuls, plafonds globaux, etc.) peuvent différer. Données à titre indicatif.",
    resultDisclaimer:
      "Estimation indicative — primes MaPrimeRénov’ et CEE (plusieurs lots : total simplifié) — simulation non contractuelle",

    logoUrl: "assets/PPF-LOGO.png",
    logoAlt: "PPF",
    brandHomeUrl: "https://ppf.fr/qui-sommes-nous/",
    outlineCtaLabel: "Découvrir PPF",
    outlineCtaHref: "https://ppf.fr/qui-sommes-nous/"
  };

  function omitUndefined(raw) {
    if (!raw || typeof raw !== "object") return {};
    var out = {};
    Object.keys(raw).forEach(function (k) {
      if (raw[k] !== undefined) out[k] = raw[k];
    });
    return out;
  }

  var rawCustom =
    typeof window.SIMULATOR_BRAND === "object" && window.SIMULATOR_BRAND !== null
      ? window.SIMULATOR_BRAND
      : {};
  var custom = omitUndefined(rawCustom);
  var customCssVars = omitUndefined(custom.cssVars || {});
  delete custom.cssVars;

  var mergedCssVars = Object.assign({}, DEFAULT_CSS_VARS, customCssVars);

  window.SIMULATOR_BRAND = Object.assign({}, defaults, custom, {
    cssVars: mergedCssVars
  });

  /**
   * Précharge Google Fonts depuis la même origine habituelle si une URL de feuille est définie.
   * Videz fontStylesheetHref ("" dans SIMULATOR_BRAND) pour désactiver le chargement auto.
   */
  function injectBrandFonts() {
    var href = window.SIMULATOR_BRAND.fontStylesheetHref;
    if (href == null || String(href).trim() === "") return;

    var head = document.head;
    if (!head) return;

    function ensureOnce(id, build) {
      if (document.getElementById(id)) return;
      head.appendChild(build());
    }

    ensureOnce("simulator-brand-font-preconnect-google", function () {
      var ln = document.createElement("link");
      ln.id = "simulator-brand-font-preconnect-google";
      ln.rel = "preconnect";
      ln.href = "https://fonts.googleapis.com";
      return ln;
    });
    ensureOnce("simulator-brand-font-preconnect-gstatic", function () {
      var ln = document.createElement("link");
      ln.id = "simulator-brand-font-preconnect-gstatic";
      ln.rel = "preconnect";
      ln.href = "https://fonts.gstatic.com";
      ln.crossOrigin = "";
      return ln;
    });

    var existingCss = document.getElementById("simulator-brand-font-stylesheet");
    if (existingCss && existingCss.getAttribute("href") === href) return;
    if (existingCss) existingCss.remove();

    var sheet = document.createElement("link");
    sheet.id = "simulator-brand-font-stylesheet";
    sheet.rel = "stylesheet";
    sheet.href = String(href);
    head.appendChild(sheet);
  }

  injectBrandFonts();

  var pt = window.SIMULATOR_BRAND.pageTitle;
  if (pt != null && String(pt).trim() !== "") document.title = String(pt);

  function applySimulatorVersion() {
    var v = window.SIMULATOR_BRAND.simulatorVersion;
    if (v == null || String(v).trim() === "") {
      document.documentElement.removeAttribute("data-simulator-version");
      return;
    }
    document.documentElement.setAttribute("data-simulator-version", String(v));
  }

  applySimulatorVersion();

  function applyBrandCssVars(vars) {
    if (!vars || typeof vars !== "object") return;
    var root = document.documentElement;
    Object.keys(vars).forEach(function (key) {
      root.style.setProperty(key, vars[key]);
    });
  }

  applyBrandCssVars(window.SIMULATOR_BRAND.cssVars);

  /**
   * Réduit XSS sur headerSubtitle : liste blanche de balises si DOMPurify est disponible ;
   * sinon extraction texte brute (perte du gras) via DOMParser.
   */
  function sanitizeHeaderSubtitle(raw) {
    var html = String(raw);
    var purifyFn = window.DOMPurify && typeof window.DOMPurify.sanitize === "function" ? window.DOMPurify.sanitize : null;
    if (purifyFn) {
      return purifyFn(html, {
        ALLOWED_TAGS: ["strong", "em", "b", "i", "br", "a"],
        ALLOWED_ATTR: ["href", "title", "target", "rel"],
        ALLOW_DATA_ATTR: false
      });
    }
    try {
      var doc = new DOMParser().parseFromString(html, "text/html");
      return doc.body ? doc.body.textContent || "" : "";
    } catch (_e) {
      return "";
    }
  }

  function applySimulatorBrand() {
    var b = window.SIMULATOR_BRAND;
    applySimulatorVersion();
    applyBrandCssVars(b.cssVars);

    if (b.pageTitle != null && String(b.pageTitle).trim() !== "") {
      document.title = String(b.pageTitle);
    }

    var h1 = document.getElementById("brand-header-title");
    if (h1) {
      h1.textContent = b.headerTitle == null ? "" : String(b.headerTitle);
    }

    var sub = document.getElementById("brand-header-subtitle");
    if (sub) {
      if (b.headerSubtitle == null || b.headerSubtitle === "") {
        sub.innerHTML = "";
      } else {
        sub.innerHTML = sanitizeHeaderSubtitle(b.headerSubtitle);
      }
    }

    var foot = document.getElementById("brand-footer-text");
    if (foot) {
      foot.textContent = b.footerText == null ? "" : String(b.footerText);
    }

    var disc = document.getElementById("brand-result-disclaimer");
    if (disc) {
      disc.textContent = b.resultDisclaimer == null ? "" : String(b.resultDisclaimer);
    }

    var outline = document.getElementById("brand-bar-outline");
    if (outline) {
      var oh = b.outlineCtaHref;
      if (oh == null || String(oh).trim() === "") {
        outline.setAttribute("hidden", "");
      } else {
        outline.removeAttribute("hidden");
        outline.href = String(oh);
        if (b.outlineCtaLabel != null) {
          outline.textContent = String(b.outlineCtaLabel);
        }
      }
    }

    var logo = document.getElementById("brand-logo");
    var logoWrap = document.getElementById("brand-logo-wrap");
    if (logo && logoWrap) {
      if (b.logoUrl) {
        logo.src = b.logoUrl;
        logo.alt = b.logoAlt != null ? String(b.logoAlt) : "";
        logoWrap.hidden = false;

        var existingLink = logoWrap.querySelector("a.header__logo-link");
        if (b.brandHomeUrl) {
          var link = existingLink;
          if (!link) {
            link = document.createElement("a");
            link.className = "header__logo-link";
            logoWrap.insertBefore(link, logo);
            link.appendChild(logo);
          }
          link.href = b.brandHomeUrl;
          link.setAttribute("aria-label", b.logoAlt ? String(b.logoAlt) : "Accueil");
          link.removeAttribute("aria-hidden");
        } else if (existingLink && existingLink.contains(logo)) {
          existingLink.replaceWith(logo);
        }
      } else {
        logoWrap.hidden = true;
        logo.removeAttribute("src");
        var orphanLink = logoWrap.querySelector("a.header__logo-link");
        if (orphanLink && orphanLink.contains(logo)) {
          orphanLink.replaceWith(logo);
        }
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applySimulatorBrand);
  } else {
    applySimulatorBrand();
  }
})();
