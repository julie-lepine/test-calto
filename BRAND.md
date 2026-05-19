# Personnalisation marque blanche

Le simulateur peut être déployé pour un client sans modifier la logique métier (`cee-calculator.js`, `app.js`). Tout passe par **`brand-config.js`** et les variables CSS.

## 1. Surcharge sans toucher aux fichiers

Dans `index.html`, déclarez la config **avant** `brand-config.js` :

```html
<script>
  window.SIMULATOR_BRAND = {
    pageTitle: "Mon simulateur — Mon entreprise",
    headerTitle: "Estimez vos aides rénovation",
    headerSubtitle: "Texte affiché en brut (pas de HTML).",
    footerText: "Mentions légales ou disclaimer pied de page.",
    resultDisclaimer: "Simulation indicative — non contractuelle.",
    logoUrl: "assets/logo-client.svg",
    logoAlt: "Mon entreprise",
    brandHomeUrl: "https://example.com",
    cssVars: {
      "--brand-primary": "#0055aa",
      "--brand-primary-hover": "#003d7a",
      "--brand-primary-muted": "#0055aacf",
      "--brand-primary-soft": "#0055aa28",
      "--brand-on-primary": "#ffffff",
      "--brand-bg-page": "#f6f8fb",
      "--brand-gradient-spot-1": "transparent",
      "--brand-gradient-spot-2": "transparent"
    }
  };
</script>
<script src="cee-calculator.js"></script>
<script src="brand-config.js"></script>
<script src="app.js"></script>
```

- **`headerSubtitle`**, **`footerText`**, **`resultDisclaimer`**, **`headerTitle`** : facultatifs. S’ils sont **omis** de `window.SIMULATOR_BRAND`, le contenu déjà présent dans `index.html` n’est pas écrasé. Le sous-titre est le premier paragraphe du `<main>` (`#brand-header-subtitle`).
- **`pageTitle`** : appliqué **seulement** si vous le définissez dans `SIMULATOR_BRAND` ; sinon l’onglet du navigateur reste celui du `<title>` dans `index.html`.
- **Logo** : le marquage HTML du logo n’est plus dans la page par défaut. Pour l’activer à la marque, rajoutez le bloc `#brand-logo-wrap` / `#brand-logo` dans l’en-tête et renseignez `logoUrl` (et optionnellement `brandHomeUrl`).

## 2. Variables CSS utiles (`cssVars`)

Les noms suivants sont lus dans `styles.css` (surcharge sur `:root`).

| Variable | Rôle |
|----------|------|
| `--brand-primary` | Bordures, emphase, dégradé barre de progression |
| `--brand-primary-muted` | Fond bouton principal, focus |
| `--brand-primary-hover` | Survol bouton, montants mise en avant |
| `--brand-primary-soft` | Halo focus champs |
| `--brand-on-primary` | Texte sur bouton primaire |
| `--brand-surface` | Fond cartes / champs (alias `--bg`, `--bg-card`) |
| `--brand-text` | Texte principal |
| `--brand-text-muted` | Labels, textes secondaires |
| `--brand-danger` | Erreurs, alertes |
| `--brand-radius` | Rayons des cartes |
| `--brand-shadow` | Ombre des cartes |
| `--brand-page-max-width` | Largeur max du contenu |
| `--brand-font-sans` | Police corps |
| `--brand-font-display` | Police titres / montants |
| `--brand-bg-page` | Couleur de fond sous les dégradés |
| `--brand-gradient-spot-1` / `--brand-gradient-spot-2` | Taches d’arrière-plan (mettre `transparent` pour un fond uni) |
| `--brand-gradient-spot-1-pos` / `--brand-gradient-spot-2-pos` | Position des taches (`10% -20%`, etc.) |
| `--brand-header-logo-max-h` | Hauteur max. du logo dans le bandeau (px) |

Les alias historiques (`--accent`, `--border`, etc.) restent dérivés des tokens `--brand-*` : vous pouvez ne surcharger que **`--brand-primary`** et familles si vous préférez.

## 3. Polices

Par défaut, les polices Google sont chargées dans `index.html`. Pour une marque cliente : retirez ou remplacez le `<link>` des fonts et définissez par exemple :

```js
cssVars: {
  "--brand-font-sans": "'Segoe UI', system-ui, sans-serif",
  "--brand-font-display": "Georgia, serif"
}
```

## 4. Copie du fichier de config

Vous pouvez dupliquer `brand-config.js`, y remplir `defaults` (y compris textes optionnels) et versionner un fichier par client, en gardant le même `index.html` et les mêmes scripts métier.
