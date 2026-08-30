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
- **Deux rendus, un seul contenu** sur les sites qui déclarent `desktopRender`.

## Les deux rendus et l'indexation

Un site peut servir deux HTML à la même adresse, selon le support (D105). C'est
de la diffusion dynamique au sens de Google, et elle est permise à deux
conditions, qui ne sont pas négociables :

- **`Vary: User-Agent`** sur les réponses HTML. C'est du protocole : sans lui,
  le premier cache intermédiaire sert le mauvais rendu au visiteur suivant. Le
  Caddyfile généré le pose, avec `Sec-CH-UA-Mobile` à côté, et jamais sur
  `/_astro/*` dont les fichiers ne dépendent d'aucun support.
- **Le rendu mobile porte tout le contenu.** Google indexe avec son robot
  smartphone : un texte, un lien, une métadonnée ou un JSON-LD présent au seul
  bureau n'est jamais vu. Le rendu bureau ne fait que présenter autrement.

Le socle compare les deux HTML après chaque build — titres, description,
canonique, `hreflang`, données structurées, texte visible et liens. L'écart
ressort en avertissement de `basalte check --build`, et une mise en ligne qui le
porte sort quand même en prévenant le mainteneur : c'est du référencement
amoindri, pas une panne (D108).

Le gain de cette séparation n'est pas le poids — la page n'embarque aucun
JavaScript et son CSS est déjà découpé par composant, l'écart se compte en un
ou deux kilo-octets compressés. Le gain est la mise en page.

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
