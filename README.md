# Simulateur de primes rénovation — aperçu

Application statique (HTML / CSS / JS) : estimation indicative **CEE** et **MaPrimeRénov’** (plusieurs lots).

## Démarrage rapide

À la racine du dépôt :

```bash
npx serve
```

Ouvrir **`index.html`** (souvent via `http://localhost:3000` selon l’outil).

## Fichiers principaux

| Fichier | Rôle |
|--------|------|
| **`index.html`** | Page complète du simulateur |
| **`styles.css`** | Mise en page + variables sémantiques (`--bg`, … → `var(--brand-*)`) |
| **`brand-config.js`** | Thème (`--brand-*`), polices, textes, logo, **`simulatorVersion`** |
| **`cee-calculator.js`**, **`app.js`** | Logique métier et UI formulaire |
| **`test-brand.html`** | Recette rapide marque / surcouches (`?case=…`) |

Détail DA, surcharge `SIMULATOR_BRAND`, ordre des scripts : **[BRAND.md](./BRAND.md)**.

## Marque blanche & intégration partenaire

- Référence longue : **[BRAND.md](./BRAND.md)**.
- **Exemples d’embedding** (snippet CDN, iframe) : **[examples/client-demo/](./examples/client-demo/)**.

Modèle courant : vous hébergez les fichiers sur votre domaine (URLs absolues) ; la page partenaire charge **CSS → DOMPurify → `brand-config.js`**, puis les scripts métier (`cee-calculator.js`, `app.js`, etc.).

## Versioning recommandé

- Aligner **`simulatorVersion`** (`defaults` dans `brand-config.js` ou surcharge `SIMULATOR_BRAND`) avec votre **tag Git** lors d’une release (ex. `v1.0.0`).
- En prod : **`document.documentElement.getAttribute('data-simulator-version')`** dans la console indique le pack chargé.
