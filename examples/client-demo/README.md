# Exemples d’intégration partenaire

À copier‑coller dans votre doc livrée au client après **substitution des URL** (`https://simulateur.EXEMPLE.fr/v1/…`).

| Fichier | Usage |
|---------|--------|
| **`snippet-cdn.html`** | Fragment `<head>` + scripts en bas : surcharge `SIMULATOR_BRAND`, même ordre que la prod (`BRAND.md`, arborescence `css/`, `js/`) |
| **`iframe-demo.html`** | Page minimale : iframe vers le simulateur déjà déployé (chemin relatif **dev** depuis ce dépôt) |

Pour tester **`iframe-demo.html`** : depuis la racine du repo, `npx serve`, puis ouvrir  
`/examples/client-demo/iframe-demo.html`.

En production vous remplacerez le `src` de l’iframe par l’URL finale **HTTPS** du simulateur hébergé chez vous.
