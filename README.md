# Moana Coach Sportif — démo de refonte

Nouvelle version (démo) du site [moana-coach-sportif.re](https://moana-coach-sportif.re/) : site statique HTML/CSS/JS, pensé d'abord pour le mobile, sans framework.

Démo en ligne (après publication) : https://malbariolunik.github.io/moana-coach-sportif-demo/

## Contenu

- `index.html` : la page unique (mêmes textes que le site actuel)
- `assets/css/style.css` : styles (mobile d'abord, puis tablette ≥ 640 px et ordinateur ≥ 960 px)
- `assets/js/main.js` : menu mobile, vidéos chargées à la demande, carrousel, formulaire → WhatsApp
- `assets/img/` : logo détouré, icônes, vignettes des vidéos, photo (WebP + JPG)
- `assets/video/` : vidéos du site actuel, recompressées en MP4 (H.264)

## Aperçu en local

```bash
python -m http.server 8791
```

Puis ouvrir http://localhost:8791

## À vérifier avant la mise en ligne définitive

- Numéro WhatsApp : le site actuel utilise un numéro factice (`262000000000`) ; la démo utilise le numéro du pied de page (0692 43 13 57). Il se change dans `assets/js/main.js` (`PHONE_WA`) et dans les liens `wa.me` / `tel:` de `index.html`.
- Avis clients : les noms sont encore « Prénom, 32 ans » / « Prénom, 41 ans » comme sur le site actuel.
- Crédit « Site réalisé par La Kaz Web » repris du site actuel.
- La balise `<meta name="robots" content="noindex">` empêche Google d'indexer la démo : à retirer sur le vrai domaine, et mettre à jour l'URL de `og:image`.
