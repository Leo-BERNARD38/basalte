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
- **Métadonnées**, Open Graph et JSON-LD générés depuis `site.config.ts`, la
  fiche d'entreprise et le contenu. Le bloc `faq` émet un `FAQPage`.
- **`robots.txt` et sitemap** générés au build.
- **Redirections** déclarées avec le site, rendues en pages au build (D122).
- **Page 404** aux couleurs du site, dans les deux rendus (D123).
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

## Ce que le `<head>` porte

Tout est posé dans `src/astro/Layout.astro`, et nulle part ailleurs : les deux
rendus passent par ce fichier, ils ne peuvent donc pas diverger sur ce que
Google lit — ce que le contrat entre les deux rendus exige.

| Balise | D'où elle vient |
|---|---|
| `<title>`, `description` | `meta` de la page, dans la langue rendue |
| `canonical`, `alternate hreflang`, `x-default` | la route et les langues en ligne |
| `og:type`, `og:site_name`, `og:title`, `og:description`, `og:url`, `og:locale` | `site.config.ts` et `meta` |
| `og:image` + largeur, hauteur, texte alternatif | `meta.image`, sinon la première image de la page (D124) |
| `twitter:card` | `summary_large_image` avec image, `summary` sans |
| `<link rel="icon">` | `public/favicon.svg`, écrit par `basalte init` |
| `application/ld+json` | un bloc par nœud — voir ci-dessous |

Le JSON est échappé sur `<`, `>` et `&` : le contenu porte du texte que le
client écrit, et `</script>` y est une chaîne comme une autre (invariant 1).

## Les données structurées

Trois sources, et trois seulement (`src/seo/structured.ts`) :

- **`WebSite`** — sur la seule page d'accueil : ailleurs, il se répète.
- **`Organization`, ou un type de commerce local** — depuis
  `content/business.json` (D120). Une fiche sans raison sociale n'émet rien :
  mieux vaut aucune donnée qu'une fiche vide. Le type déclaré — artisan,
  boutique, restaurant — ne sert que si l'adresse est complète ; sinon la fiche
  retombe sur `Organization`, parce qu'un commerce de proximité sans adresse
  n'en est pas un.
- **ce qu'une section déclare** — par une fonction `structured` de son schéma
  (D121), jamais par un `<script>` dans son composant : la variante bureau
  reçoit les mêmes valeurs, si bien que les deux rendus ne peuvent pas différer.

La fiche d'entreprise s'édite depuis « Édition », comme le chrome. Ses champs
vivent à côté de leur seul consommateur, dans `src/seo/business.ts`.

## Le sitemap

Les pages, croisées avec les langues **en ligne** — une langue en préparation
n'est pas construite, elle n'a pas d'adresse à donner. Une page dont toutes les
sections sont masquées dans une langue n'y figure pas : elle s'afficherait vide,
et une page vide indexée vaut moins que rien. Le préfixe du rendu bureau
n'apparaît jamais : il ne sort pas du disque, les deux rendus partagent une
seule adresse publique (D103).

## Redirections et page 404

Une redirection se déclare dans `site.config.ts` :

```ts
redirects: {
  '/ancienne-page': '/nouvelle-page',
}
```

Le build en écrit une page à rafraîchissement instantané, que Google lit comme
une redirection permanente. Elle n'est pas une règle du proxy, et c'est
délibéré : le `Caddyfile` n'est écrit qu'à l'`init` et n'est jamais régénéré
(D106), si bien qu'une redirection ajoutée après coup n'y arriverait jamais
(D122). `basalte check` signale une redirection qu'une page recouvre — c'est la
page qui répond — et une cible interne qui n'existe pas.

La page 404 porte le chrome, donc la navigation, donc un chemin de sortie. Elle
est injectée une fois par support ; Caddy la sert avec son statut, jamais 200 —
une page d'erreur qui répond « tout va bien » se fait indexer. Un dépôt plus
ancien que cette phase est averti par `basalte check --build` : son `Caddyfile`
n'a pas de `handle_errors`.

## Ce qui est refusé, et ce qui est seulement dit

`basalte check` valide chaque page contre son schéma. Il regarde aussi le site
comme un tout, ce qu'aucune validation de page ne peut faire : deux pages y
portent parfois le même titre, une page se partage parfois sans vignette.

La ligne entre refuser et avertir est **ce que le client peut corriger à
l'instant où il le crée**, depuis le panel, avec ce qu'il y voit. Le panel
n'enregistre qu'une page à la fois : tout ce qui se constate sur cette page-là
peut refuser, tout ce qui demande de regarder les autres ne le peut pas — le
client découvrirait le refus à la publication, sur un défaut créé la veille.

**Refusé** — le panel n'enregistre pas, `check` sort en erreur :

- un titre de page vide, et depuis cette phase une **description vide** (D138)
  dans une langue en ligne. Les deux sont ce que les moteurs affichent, et les
  deux sont sous les yeux du client quand il édite la page ;
- une traduction manquante dans une langue en ligne ;
- une image sans **texte alternatif** dans une langue en ligne. Il est saisi
  une fois par image, à son dépôt dans la médiathèque, et non par emploi
  (D140) ;
- une image ou un document absent de la médiathèque.

**Dit sans refuser** — `check` sort en zéro, et le panel les liste :

- un **titre ou une description repris** d'une page à l'autre (D139) : les
  moteurs n'en afficheraient qu'une, et le message nomme l'autre page ;
- une page qui se **partage sans vignette** : ni image choisie, ni image dans
  ses sections, sur lesquelles la carte retombe (D124). Une page de service en
  est exemptée (D133) ;
- une **fiche d'entreprise** sans raison sociale — le site n'émet alors aucune
  donnée structurée — ou dont l'adresse est incomplète, ce qui fait retomber le
  type déclaré sur `Organization` ;
- une image au mauvais format pour son emplacement, une redirection recouverte
  ou sans cible, un média qu'aucune section n'emploie.

Tout cela se lit sur le contenu, jamais sur le HTML construit (D141) : ce qui
demande le HTML — le plan de titres, le contrat des deux rendus et le poids
d'une page — vit dans la moitié post-`--build`, qui avertit toujours et ne
refuse jamais.

### Le poids d'une page

Une liste de bloc n'a pas de borne haute (D160), et c'est bien ce qu'on veut :
une FAQ s'allonge autant que le client en a. Mais la borne tenait une chose
qu'elle ne disait pas — une galerie de soixante photos se compte en mégaoctets,
et personne ne l'aurait vu avant la mise en ligne.

`check --build` mesure donc, page par page, ce qu'un navigateur télécharge en
l'ouvrant : son HTML, ses feuilles de style, et pour chaque image la plus large
de ses dérivées, celle qu'un grand écran choisit dans le `srcset`. Les documents
n'y sont pas : un PDF part au clic, jamais à l'ouverture. Au-delà de deux
mégaoctets, la page est nommée avec son poids.

Il avertit, il ne refuse pas (D162) : il n'y a pas de poids au-delà duquel une
page cesse de fonctionner, il y a un poids au-delà duquel elle se fait
attendre.

## Ce que le site contient déjà

`basalte content` relève, depuis le contenu et sans rien construire, les pages
et leurs adresses, les sections que chacune porte, l'avancement des traductions,
la vignette de partage effective, les médias qu'aucune section n'emploie et la
fiche d'entreprise. `--json` en rend la forme brute.

C'est le pendant de `basalte inventory`, qui dit ce qui est *disponible* pour
écrire : celui-ci dit ce qui est *écrit*. La commande est à part parce que les
deux n'ont ni la même source ni la même fraîcheur (D136), et elle n'écrit aucun
fichier — un relevé faux au premier enregistrement coûterait plus que pas de
relevé du tout (D137).

## Le cadrage des images

Un `f.image({ ratio })` est une intention, et c'est le **point focal** qui la
tient (D178). Le client ne découpe rien : il désigne le sujet, une fois, dans la
médiathèque.

**Le point focal est le seul réglage d'image.** Il se pose en pourcentage sur
l'originale, et `resolveImage` le rend en `object-position`. Un emplacement en
`object-fit: cover` cadre donc autour de ce point, quelle que soit la forme
qu'il demande — un bandeau en 16/9 et une vignette en 4/3 se servent du même,
et le corriger ne réencode rien. **Sans point défini, c'est le centre** :
`50% 50%`, ce qu'un navigateur ferait de toute façon, et ce qui convient à la
plupart des photos.

C'est ce qui remplace le recadrage. Découper donnait le format et figeait une
forme : la même photo servant deux emplacements demandait deux découpes, donc
deux clés, et corriger le cadrage demandait de recommencer. Le point focal sert
tous les emplacements à la fois, et il se déplace.

**Le format attendu n'est connu que du champ.** La médiathèque ne déclare aucun
ratio ; c'est l'emplacement qui le fait. Une image d'une autre forme n'est plus
refusée — elle est cadrée. `basalte check` avertit sans bloquer : la page
s'affiche, et forcer une correction avant tout enregistrement bloquerait un site
qui fonctionne. Le ratio reste une valeur, et non une valeur par support (D119).

**Un bloc qui recadre pose le point focal.** Les sept blocs du socle qui rendent
une image en `cover` écrivent son `object-position` ; `logos` ne le fait pas, et
n'a pas à le faire — il est en `contain`, un logo ne se recadre pas. Rien ne
l'impose encore à un bloc nouveau : c'est une issue ouverte, et une règle de
`basalte lint` le jour où elle se prend.

Les recadrages faits avant D178 restent des médias comme les autres. Leur
filiation continue d'être lue, et supprimer l'originale dont un dérivé est en
ligne reste refusé.

## Le journal

Un billet est une page aux yeux du référencement, et il le devient vraiment :
compilé en `Page`, il traverse le sitemap, les `hreflang`, la carte de partage
et le plan de titres par le même chemin que les autres (D152).

- **Le sitemap** les porte comme les pages, et par la même règle : un billet
  masqué dans une langue n'y figure pas pour cette langue, et un billet masqué
  partout n'y figure pas du tout.
- **Le `h1`** est le titre du billet : sa section est la première, donc elle
  porte le rang un (D115).
- **Le JSON-LD** du gabarit rend un `BlogPosting` — le seul balisage que Google
  lit encore pour le journal d'une entreprise. Son `author` **désigne** le nœud
  de l'entreprise (`#entreprise`) plutôt que de le recopier : il est déjà posé
  sur cette page, et deux descriptions de la même société se contrediraient.
- **La carte de partage** retombe sur la couverture du billet. Elle n'est pas
  recopiée dans `meta.image` : le champ y déclare `1200/630`, une couverture
  d'article est en `16/9`, et chaque billet aurait porté un avertissement que
  rien ne permettait de corriger (D158).
- **Le flux RSS** sort par langue en ligne, à `/<base>.xml` pour la langue par
  défaut et `/<base>.<code>.xml` pour les autres. Il porte les vingt derniers
  billets — un lecteur ne remonte pas plus loin, et un flux de trois cents
  billets pèserait plus que le site. Chaque page indexable l'annonce dans son
  `<head>`.
- **L'index n'est pas paginé** (D159) : il porte tout le journal, groupé par
  année. Aucun billet ne devient inatteignable, et il n'y a ni canonique ni
  `prev`/`next` à tenir. Une issue bloquée dit ce qui ferait revenir la
  pagination.
