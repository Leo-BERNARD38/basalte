# SEO et performances

Découlent en grande partie des choix d'architecture plutôt que d'un effort
dédié.

- **HTML pré-rendu** servi depuis le disque, **zéro JavaScript par défaut**.
  L'interactivité est opt-in bloc par bloc : un carrousel charge son script, le
  reste de la page n'en charge aucun.
- **Routes par langue** : `/` pour la langue par défaut, `/en/` ensuite, avec
  `hreflang` et sitemap couvrant **les langues en ligne**. Elles sont produites
  par `getStaticPaths` (D44). Une
  langue en préparation n'est pas construite, donc absente du sitemap et des
  `hreflang` ; une page masquée dans une langue l'est aussi
  (`modele-contenu.md`).
- **Images** converties en WebP avec `srcset` par taille d'écran, produites au
  moment où l'image entre dans le site et non au build (D40).
- **Métadonnées**, Open Graph et JSON-LD générés depuis `site.config.ts` et le
  contenu. Le bloc FAQ émet un `FAQPage`.
- **`robots.txt` et sitemap** générés au build.

## Le piège que le socle contourne

Astro n'optimise nativement que les images **importées dans le code**, pas
celles désignées par une chaîne venue d'un JSON. C'est là que la plupart des
projets perdent leur score sans comprendre pourquoi.

Le socle ne se branche pas sur ce mécanisme : il produit lui-même les largeurs
au moment de l'ingestion, par sharp, et le build se contente de recopier
`public/`. Le ré-encodage étant de toute façon obligatoire au téléversement
(invariant 3), les largeurs sortent de la même passe. Trois conséquences :

- une publication ne traite aucune image, donc ne peut pas saturer la mémoire
  d'un petit VPS ni faire durer un build
- il n'y a aucun cache d'images à préserver d'une version à l'autre
- une image arrivée par git est traitée comme une image téléversée, parce que
  `basalte check` passe la même fonction dessus

Le manifeste `content/media.json` porte ce que le rendu a besoin de savoir :
largeurs produites, dimensions, texte alternatif par langue, point focal.
