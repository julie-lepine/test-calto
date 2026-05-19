/**
 * =============================================================================
 * CONFIGURATION MARQUE BLANCHE — où mettre quoi ?
 * =============================================================================
 *
 * ► Pourquoi mes changements dans index.html ne s’affichent pas ?
 *
 *   Ce script tourne au chargement de la page et met à jour les éléments #brand-*.
 *   Une clé **renseignée** dans `window.SIMULATOR_BRAND` remplace alors le HTML pour ce champ.
 *   Les `defaults` ne fixent pas le <h1> : éditez-le dans index.html.
 *   En revanche logo + bouton « Découvrir PPF » (bandeau du haut, pas site-header__bar)
 *   ont des valeurs PPF par défaut ; surchargez-les via window.SIMULATOR_BRAND si besoin.
 *
 *   Pour piloter depuis le script (client déployé sans toucher au HTML) : définissez
 *   window.SIMULATOR_BRAND AVANT ce fichier, ex. headerTitle, headerSubtitle, logoUrl…
 *
 *   Autres causes fréquentes : cache navigateur (Ctrl+F5), ou fichier ouvert ailleurs
 *   qu’une autre copie du dossier.
 *
 * -----------------------------------------------------------------------------
 * Clés optionnelles (à passer dans window.SIMULATOR_BRAND si besoin) :
 *
 *   pageTitle          — remplace <title> uniquement si la clé est fournie (sinon on garde le HTML)
 *   headerTitle        — texte du <h1>
 *   headerSubtitle     — texte BRUT du paragraphe #brand-header-subtitle (main)
 *   footerText, resultDisclaimer
 *   logoUrl, logoAlt, brandHomeUrl — logo du bandeau (#brand-logo-wrap)
 *   outlineCtaLabel, outlineCtaHref — bouton contour à droite du logo (#brand-bar-outline)
 *   cssVars            — variables CSS (voir BRAND.md)
 *
 * =============================================================================
 */

(function () {
  var defaults = {
    logoUrl: "assets/PPF-LOGO.png",
    logoAlt: "PPF",
    brandHomeUrl: "https://ppf.fr/qui-sommes-nous/",
    outlineCtaLabel: "Découvrir PPF",
    outlineCtaHref: "https://ppf.fr/qui-sommes-nous/",
    cssVars: {}
  };

  var custom =
    typeof window.SIMULATOR_BRAND === "object" && window.SIMULATOR_BRAND !== null
      ? window.SIMULATOR_BRAND
      : {};

  var mergedCssVars = Object.assign({}, defaults.cssVars, custom.cssVars || {});

  window.SIMULATOR_BRAND = Object.assign({}, defaults, custom, {
    cssVars: mergedCssVars
  });

  function applySimulatorBrand() {
    var b = window.SIMULATOR_BRAND;

    if (b.pageTitle != null && String(b.pageTitle).trim() !== "") {
      document.title = b.pageTitle;
    }

    var root = document.documentElement;
    if (b.cssVars && typeof b.cssVars === "object") {
      Object.keys(b.cssVars).forEach(function (key) {
        root.style.setProperty(key, b.cssVars[key]);
      });
    }

    var h1 = document.getElementById("brand-header-title");
    if (h1 && b.headerTitle !== undefined) {
      h1.textContent = b.headerTitle == null ? "" : String(b.headerTitle);
    }

    var sub = document.getElementById("brand-header-subtitle");
    if (sub && b.headerSubtitle !== undefined) {
      sub.textContent = b.headerSubtitle == null ? "" : String(b.headerSubtitle);
    }

    var foot = document.getElementById("brand-footer-text");
    if (foot && b.footerText !== undefined) {
      foot.textContent = b.footerText == null ? "" : String(b.footerText);
    }

    var disc = document.getElementById("brand-result-disclaimer");
    if (disc && b.resultDisclaimer !== undefined) {
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
