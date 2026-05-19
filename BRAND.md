# Personnalisation marque blanche

Le simulateur peut être déployé pour un client sans modifier la logique métier (`js/calculators/`, `js/app.js`). Le graphisme passe par **`js/brand/brand-config.js`** (variables `--brand-*` sur `<html>`) et les champs optionnels titre, logo, CTA et textes.

## Ordre de chargement recommandé

1. Dans le `<head>` : **`css/styles.css`**, puis la librairie **DOMPurify** (CDN), puis **`js/brand/brand-config.js`** — le sous-titre en HTML est sanitizé avant injection.
2. Dans le pied de page (ou après le DOM métier) : **`js/lead/lead-email-layout.js`**, **`js/lead/lead-submit.js`**, **`js/calculators/cee-calculator.js`**, puis **`js/app.js`**.
3. **Une seule** inclusion de `brand-config.js`.

Pour surcharger sans éditer `js/brand/brand-config.js`, déclarez `window.SIMULATOR_BRAND` **avant** ce script (inline ou fichier dédié chargé avant). Les clés absentes ou à `undefined` ne remplacent pas les défauts ; `null` ou `""` écrase volontairement (ex. texte vide, désactivation des polices).

## Exemple de surcharge dans le `<head>`

```html
<link rel="stylesheet" href="css/styles.css" />

<script src="https://cdn.jsdelivr.net/npm/dompurify@3.2.2/dist/purify.min.js" crossorigin="anonymous"></script>

<script>
  window.SIMULATOR_BRAND = {
    pageTitle: "Mon simulateur — Mon entreprise",
    headerTitle: "Estimez vos aides rénovation",
    headerSubtitle:
      "Texte affiché en brut sous le titre (élément #brand-header-subtitle).",
    footerText: "Mentions légales ou disclaimer pied de page.",
    resultDisclaimer: "Simulation indicative — non contractuelle.",
    logoUrl: "assets/logo-client.svg",
    logoAlt: "Mon entreprise",
    brandHomeUrl: "https://example.com/",
    outlineCtaLabel: "Notre site",
    outlineCtaHref: "https://example.com/",
    /* Optionnel : URL complete de la feuille @font-face (Google Fonts « CSS », etc.). Mettre "" pour ne rien charger. */
    fontStylesheetHref:
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap",

    cssVars: {
      "--brand-primary": "#0055aa",
      "--brand-primary-hover": "#003d7a",
      "--brand-on-primary": "#ffffff",
      "--brand-bg-page": "#f6f8fb",
      "--brand-gradient-spot-1": "transparent",
      "--brand-gradient-spot-2": "transparent",
    },
  };
</script>
<script src="js/brand/brand-config.js"></script>
<script src="js/lead/lead-email-layout.js"></script>
<script src="js/lead/lead-submit.js"></script>
<script src="js/calculators/cee-calculator.js"></script>
<script src="js/app.js"></script>
```

### Champs JS (texte / lien / logo)

| Champ              | Effet                                                                 |
|--------------------|----------------------------------------------------------------------|
| `pageTitle`        | `document.title` si renseigné.                                       |
| `simulatorVersion` | Traçabilité pack (défaut `1.0.0` dans `defaults`) : posé sur `<html data-simulator-version="…">`. Chaîne vide : attribut retiré. |
| `headerTitle`      | `#brand-header-title`.                                               |
| `headerSubtitle`   | `#brand-header-subtitle` (si défini dans l’objet).                 |
| `footerText`       | `#brand-footer-text`.                                                |
| `resultDisclaimer`| `#brand-result-disclaimer`.                                          |
| `logoUrl`          | `src` de `#brand-logo` ; masque `#brand-logo-wrap` si vide.          |
| `logoAlt`, `brandHomeUrl` | Accessibilité et lien sur le logo.                            |
| `outlineCtaLabel`, `outlineCtaHref` | Bouton lien en-tête (`#brand-bar-outline`) ; masqué si `href` vide. |
| `leadNotificationEmail` | Destinataire des leads (e-mail de notification). |
| `leadEmailSubjectPrefix` | Préfixe d’objet (voir `lead-email-layout.js`). |
| `leadSubmitEndpoint` | POST JSON optionnel ; sinon envoi via [FormSubmit](https://formsubmit.co) vers `leadNotificationEmail`. |
| `leadFormTitle`, `leadFormIntro`, `leadConsentLabel`, `leadSubmitButtonLabel` | Textes du formulaire lead (`#lead-panel`). |
| `leadConsentBlockedTitle`, `leadConsentBlockedText` | Page affichée si la case recontact n’est pas cochée (`#lead-consent-blocked-panel`). |
| `fontStylesheetHref` | URL d’une feuille de polices (ex. lien Google Fonts `css2?...`). Chaîne vide : aucun chargement automatique. |

Les textes par défaut (titre d’onglet, h1, sous-titre, pied de page, disclaimer) sont définis dans **`defaults`** de `brand-config.js` et réappliqués au chargement.

**`headerSubtitle` (HTML)** : le contenu est passé dans **DOMPurify** avec une liste blanche — balises conservées : `strong`, `em`, `b`, `i`, `br`, `a` (attributs `href`, `title`, `target`, `rel`). Le reste est retiré. Si DOMPurify n’est pas chargé (snippet incomplet), repli : tout le markup est ramené au **texte brut** (`DOMParser`), sans exécution de script. À charge de la marque de ne pas mettre dans la config une chaîne non maîtrisée (pas de champ public non filtré).

Sans JavaScript, le contenu initial de `index.html` reste affiché.

**Déploiement sur votre infra** : servir également `purify.min.js` (comme dans `index.html`) **avant** `brand-config.js`, ou même origine CDN (version figée recommandée).

## Variables CSS (`cssVars`)

Les valeurs par défaut sont dans **`DEFAULT_CSS_VARS`** dans `brand-config.js`. Vous pouvez n’en surcharger qu’une partie via `SIMULATOR_BRAND.cssVars`.

Les **alias** suivants sont définis dans `styles.css` et pointent vers les `--brand-*` : `--bg`, `--bg-card`, `--border`, `--text`, `--text-muted`, `--accent`, `--accent-hover`, `--accent-soft`, `--danger`, `--radius`, `--shadow`, `--font-sans`, `--font-display`.

### Liste des clés `--brand-*` (défaut PPF)

| Clé | Rôle typique |
|-----|----------------|
| `--brand-primary` | Bordures, emphase générale |
| `--brand-primary-muted` | Bouton primaire (fond), états intermédiaires |
| `--brand-primary-hover` | Survol, accents forts |
| `--brand-primary-soft` | Halos légers (pills header, secondaire hover) |
| `--brand-on-primary` | Texte sur bouton primaire |
| `--brand-surface` | Fond cartes / zones claires |
| `--brand-text` | Texte principal |
| `--brand-text-muted` | Labels, textes secondaires |
| `--brand-danger` | Erreurs, alertes |
| `--brand-danger-bg-soft` | Fond bloc d’alerte résultat |
| `--brand-danger-border-strong` | Bordure bloc d’alerte |
| `--brand-danger-focus-ring` | Ombre focus champ invalide |
| `--brand-radius` | Rayon cartes |
| `--brand-control-radius` | Champs, boutons |
| `--brand-control-radius-sm` | Bouton ghost |
| `--brand-radius-pill` | Pills header, rail progression |
| `--brand-shadow` | Ombre cartes |
| `--brand-page-max-width` | Largeur max contenu (.page / header interne) |
| `--brand-header-logo-max-h` | Hauteur max du logo |

**En-tête**

| Clé | Rôle typique |
|-----|----------------|
| `--brand-header-background` | Fond bandeau |
| `--brand-header-text` | Titre bandeau |
| `--brand-header-divider-color` | Ligne sous ligne logo |
| `--brand-divider-color` | (Réserve ; header utilise souvent divider dédiée) |
| `--brand-header-top-border-width`, `--brand-header-top-border-color` | Liseré supérieur |
| `--brand-header-shadow` | Ombre sous le header |

**Page & progression**

| Clé | Rôle typique |
|-----|----------------|
| `--brand-bg-page` | Couleur de fond sous les « taches » |
| `--brand-gradient-spot-1`, `--brand-gradient-spot-2` | Couleurs des halos (`transparent` pour fond uni) |
| `--brand-gradient-spot-1-pos`, `--brand-gradient-spot-2-pos` | Positions (`10% -20%`, `100% 50%`, etc.) |
| `--brand-progress-end` | Extrémité du dégradé barre |
| `--brand-progress-track-height` | Épaisseur du rail |

**Typographie**

| Clé | Rôle typique |
|-----|----------------|
| `--brand-font-sans`, `--brand-font-display` | Familles (guillemets si noms avec espaces) |
| `--brand-title-page-size`, `--brand-title-amount-size` | Titres (`clamp(...)`) |

**Boutons formulaire**

| Clé | Rôle typique |
|-----|----------------|
| `--brand-btn-primary-bg`, `--brand-btn-primary-color` | Primaire |
| `--brand-btn-primary-hover-bg`, `--brand-btn-primary-hover-color` | Survol primaire |
| `--brand-btn-secondary-bg`, `-color`, `-border` | Secondaire |
| `--brand-btn-secondary-hover-bg`, `-color`, `-hover-border` | Survol secondaire |

## Polices

- **`fontStylesheetHref`** (défaut PPF dans `defaults`) : le script ajoute dans le `<head>` les `preconnect` usuels puis un `<link rel="stylesheet">` vers cette URL.
- **`--brand-font-sans`** / **`--brand-font-display`** dans `DEFAULT_CSS_VARS` ou `cssVars` : familles utilisées dans `styles.css`.

Pour des polices self-hostées ou un CDN autre que Google : mettez l’URL de votre feuille CSS dans `fontStylesheetHref`, ou laissez `""` et chargez vous-même les fichiers avant `brand-config.js`.

## Déploiement client

Pour un client, soit vous surchargez depuis le HTML comme ci-dessus, soit vous dupliquez **`brand-config.js`** et adaptez **`DEFAULT_CSS_VARS`**, **`DEFAULT_FONT_STYLESHEET_HREF`**, **`defaults`** (logo, CTA, textes, URL des polices).

## Page de test locale

Fichier **`test-brand.html`** : scénarios `?case=passthrough` (défaut), `css-vars-only`, `no-remote-font`, `sanitize-subtitle` — à ouvrir via un serveur HTTP local si besoin (chemins vers `css/styles.css` et `js/brand/brand-config.js`).

**Exemples partenaires** (snippet CDN, iframe) : dossier **`examples/client-demo/`**. Aperçu projet : **`README.md`** à la racine.
