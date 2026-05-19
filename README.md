# Simulateur de primes rénovation — aperçu

Application statique (HTML / CSS / JS) : estimation indicative **CEE** et **MaPrimeRénov’** (plusieurs lots).

## Démarrage rapide

À la racine du dépôt :

```bash
npx serve
```

Ouvrir **`index.html`** (souvent via `http://localhost:3000` selon l’outil).

## Arborescence

```
simulateur-primes-renovation/
├── index.html              # Page du simulateur
├── test-brand.html         # Recette marque / surcharges (?case=…)
├── README.md
├── BRAND.md                # Personnalisation marque blanche
├── assets/                 # Logos et médias
│   └── PPF-LOGO.png
├── css/
│   └── styles.css          # Mise en page + variables sémantiques
├── js/
│   ├── app.js              # UI formulaire, leads, résultats
│   ├── brand/
│   │   └── brand-config.js # Thème (--brand-*), textes, logo
│   ├── calculators/
│   │   ├── cee-calculator.js
│   │   └── mpr-calculator.js # Barèmes MPR (module autonome)
│   └── lead/
│       ├── lead-email-layout.js
│       └── lead-submit.js
└── examples/
    └── client-demo/        # Snippet CDN, iframe
```

## Fichiers principaux

| Emplacement | Rôle |
|-------------|------|
| **`index.html`** | Page complète du simulateur |
| **`css/styles.css`** | Styles (`--bg`, … → `var(--brand-*)`) |
| **`js/brand/brand-config.js`** | Thème, polices, textes, logo, **`leadNotificationEmail`**, **`simulatorVersion`** |
| **`js/lead/`** | Mise en forme et envoi des leads |
| **`js/calculators/`** | Moteurs CEE et MPR |
| **`js/app.js`** | Orchestration interface |

Détail DA, surcharge `SIMULATOR_BRAND`, ordre des scripts : **[BRAND.md](./BRAND.md)**.

## Marque blanche & intégration partenaire

- Référence longue : **[BRAND.md](./BRAND.md)**.
- **Exemples d’embedding** (snippet CDN, iframe) : **[examples/client-demo/](./examples/client-demo/)**.

Modèle courant : vous hébergez les fichiers sur votre domaine (URLs absolues) ; la page charge **CSS → DOMPurify → `js/brand/brand-config.js`**, puis **`js/lead/*`**, **`js/calculators/cee-calculator.js`**, **`js/app.js`**.

Après **Lancer la simulation**, un formulaire lead s’affiche ; les coordonnées partent par e-mail à **`leadNotificationEmail`** (première utilisation : confirmer l’adresse via FormSubmit si vous n’utilisez pas `leadSubmitEndpoint`).

## Versioning recommandé

- Aligner **`simulatorVersion`** (`defaults` dans `js/brand/brand-config.js` ou surcharge `SIMULATOR_BRAND`) avec votre **tag Git** lors d’une release (ex. `v1.0.0`).
- En prod : **`document.documentElement.getAttribute('data-simulator-version')`** dans la console indique le pack chargé.
