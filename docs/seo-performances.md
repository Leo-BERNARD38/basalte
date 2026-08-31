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

## Le cadrage des images

Un `f.image({ ratio })` était une intention que rien ne tenait. Il est
maintenant obtenu, et le client garde la main sur ce qui reste dans le cadre.

**Recadrer est une ingestion** (D117). La sortie repasse par la fonction qui
traite un téléversement : mêmes largeurs, même WebP, même nom dérivé de
l'empreinte, mêmes garanties (invariant 3). L'originale reste dans la
médiathèque, et l'entrée dérivée note d'où elle vient et quel cadre a été
retenu. Trois conséquences :

- on peut recommencer, et recadrer un recadrage repart de l'originale : aucune
  chaîne de découpes ne s'accumule, aucune passe d'encodage ne s'ajoute ;
- une même photo sert deux fois à deux formats — deux cadres, deux clés ;
- le contenu ne porte toujours qu'une chaîne, donc **aucune migration**.

Le cadre entre dans l'empreinte : refaire le même recadrage rend la même clé.

**Le format attendu n'est connu que du champ.** La médiathèque ne déclare aucun
ratio ; c'est l'emplacement qui le fait, et c'est donc depuis le champ que le
recadrage s'ouvre. `basalte check` rattrape ce qu'un contenu écrit à la main
laisserait passer, en avertissant sans bloquer : la page s'affiche, et forcer sa
correction avant tout enregistrement bloquerait un site qui fonctionne.

**Le point focal reste** (D118). Le recadrage donne le format ; le point focal
dit où est le sujet à l'intérieur de ce format, et c'est encore lui qui
travaille quand le CSS re-cadre d'un support à l'autre. Le ratio, lui, reste une
valeur et non une valeur par support (D119).
