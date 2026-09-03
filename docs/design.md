# Design

Tu produis la DA et les maquettes. Ce document ne conçoit rien : il fixe
comment une maquette devient du code, et le plancher au-dessous duquel un bloc
ne descend jamais.

## La règle qui tient tout

> **Un bloc ne contient aucune valeur de style en dur.**

Pas de `#1a2b3c`, pas de `24px`, pas de `font-family` littérale. Tout passe par
un token. Sans cette règle, la DA cesse d'être pilotable depuis
`site.config.ts` et chaque bloc dérive de son côté — le même défaut que les
valeurs magiques dans du code.

Elle est vérifiable : `basalte lint` refuse une couleur ou une longueur
littérale dans le `<style>` d'un bloc (D135), et le même contrôle tient la
feuille du panel sur sa propre couche de tokens (D164).

## Les tokens

Déclarés dans `site.config.ts`, injectés en variables CSS sur `:root`. La liste
est courte exprès — elle doit tenir dans la tête.

Établie en phase 1 et vérifiable : `resolveTokens` refuse une famille ou un nom
que le socle ne porte pas, ce qui rend l'arbitrage impossible à contourner par
distraction. Un site ne déclare que ce que sa DA change ; le reste vient du
socle.

| Famille | Tokens |
|---|---|
| Couleurs | `--color-bg` `--color-fg` `--color-muted` `--color-accent` `--color-accent-fg` `--color-border` `--color-danger` `--color-surface` `--color-contrast` `--color-contrast-fg` |
| Typographies | `--font-title` `--font-body` |
| Échelle de texte | `--text-xs` → `--text-5xl`, de 0,8125 à 4 rem |
| Espacement | `--space-1` → `--space-10`, de 0,25 à 8 rem |
| Rayons | `--radius-sm` `--radius-md` `--radius-lg` `--radius-xl` |
| Largeurs | `--width-content` `--width-wide` |

**Les couleurs portent trois plans** (D182), et c'est d'eux que vient le rythme
d'une page :

| Plan | Ce qu'il est |
|---|---|
| `bg` / `fg` | le fond, et l'encre qui s'y pose |
| `surface` | le retrait — ce qui sépare deux sections sans un trait |
| `contrast` / `contrast-fg` | le plan sombre, rendu à lui-même |

Le troisième existe pour lui-même : sans lui, un bandeau inversé détourne
l'accent, et un site qui veut ce bandeau noir n'a plus d'accent nulle part.

**Il n'y a pas de famille `shadow`** (D183) : sur le site, un filet d'un pixel
sépare deux plans, et le seul élément qui flotte est l'en-tête collant. Le
panel, lui, s'élève par ses conteneurs tonaux et cinq ombres — c'est le
langage de Material (D200), et il reste le sien.

Un besoin qui ne rentre pas dans cette liste est un token à ajouter au socle,
jamais une valeur en dur dans un bloc.

C'est ce qui fait que le même bloc `hero` a une allure radicalement différente
d'un client à l'autre sans qu'une ligne de son code change.

## Le vocabulaire de mise en page

Trois règles, appliquées à tous les blocs du socle. Elles ne sont pas des
préférences : elles sont ce qui fait qu'une page se lit comme une page, et non
comme un empilement de sections correctes.

### Une valeur qui varie se compose de deux tokens (D184)

```css
font-size: clamp(var(--text-2xl), 5vw, var(--text-3xl));
padding-block: clamp(var(--space-7), 6vw, var(--space-9));
```

Deux tokens bornent, la fenêtre interpole. Un composant tient de 375 px à
1440 px sans une seule media query, et la direction artistique reste pilotable —
les deux bornes sont des tokens. `basalte lint` l'accepte parce qu'aucune
longueur n'y est écrite : `vw` n'est l'unité d'aucun token.

C'est **la** manière de faire respirer une section. Une media query reste pour
ce qu'un `clamp` ne sait pas faire : changer un nombre de colonnes.

### Le rythme, et pas de trait

Toute section porte `padding-block: clamp(var(--space-7), 6vw, var(--space-9))`
et `padding-inline: var(--space-5)`. Ce qui sépare deux sections est **l'air et
le plan**, jamais un `border-top` — celui-ci avait fini par se répéter sur seize
blocs, et trois grilles à la suite se lisaient comme une seule.

### Le plan d'une section vient de son type (D185)

Il n'est pas offert au client : un sélecteur « fond » sur chaque bloc serait
autant d'occasions de casser la direction artistique, et D179 n'a ouvert que
l'**ordre** des sections.

| Plan | Blocs |
|---|---|
| `bg` | hero · showcase · features · steps · pricing · gallery · team · comparison · richtext · download · contact · journal · post |
| `surface` | logos · stats · bento · testimonials · faq · contact-details |
| `contrast` | cta |

### L'axe, et le bouton

L'en-tête d'une section — son titre et son introduction — est **centré** et
borné à `--width-content` ; sa grille reste sur `--width-wide`. Toutes les
sections d'une page partagent donc le même axe. Le texte de lecture, lui, n'est
jamais centré.

Le bouton ne s'écrit pas dans un bloc : il vit dans `src/astro/base.css` sous
`.button`, `.button--quiet` (l'action seconde, un filet plutôt qu'un second
aplat) et `.button--invert` (sur le plan sombre) — D186. `basalte lint` contrôle
cette feuille comme il contrôle un bloc.

## Le banc de blocs

Régler une direction artistique en rechargeant la page d'accueil, c'est régler
deux blocs sur cinq. Sous `npm run dev`, l'adresse **`/__blocs`** rend tous les
blocs disponibles — ceux du socle et ceux du dépôt — sur une seule page, dans
les tokens réels du site. Un bloc écrit ce matin y apparaît sans que rien n'ait
été déclaré.

Les valeurs affichées sont dérivées des descripteurs `f.*` : un texte vient du
libellé de son champ, une liste porte trois éléments, une image prend la
première clé de la médiathèque. Un libellé trop long pour la place qu'il occupe
se voit donc immédiatement.

Un bloc qui porte une variante bureau y figure deux fois, l'une sous l'autre et
étiquetées : c'est le seul endroit où les deux rendus d'une même section se
comparent sans changer d'onglet ni de largeur de fenêtre.

L'en-tête et le pied de page l'entourent, comme sur une vraie page : la barre
du haut est le premier élément que voit un visiteur, et elle se règle donc là
où tout le reste se règle.

C'est aussi là que le plancher ci-dessous se vérifie à l'œil, sur tous les
blocs à la fois. La route n'existe que pendant qu'on développe : aucune version
publiée ne la porte.

## Plancher, non négociable

Il s'applique à tout bloc, sur mesure comme de référence.

- **Mobile d'abord.** La maquette doit tenir à 375 px de large avant toute
  autre chose. Les media queries montent, elles ne descendent pas — et le
  composant d'un bloc **est** le rendu mobile (D104).
- **Contraste** de 4,5:1 minimum sur le texte. Deux tokens de couleur qui ne
  passent pas ensemble sont un défaut de DA, à corriger dans les tokens.
- **Focus visible.** Jamais `outline: none` sans remplacement.
- **Cibles tactiles** de 44 px minimum.
- **Texte alternatif** sur chaque image — il est déjà obligatoire au
  téléversement.
- **Aucun JavaScript** sauf si le bloc le déclare explicitement. Un bloc
  interactif charge son script, la page n'en charge aucun autre.
- **Pas de décalage de mise en page** : toute image porte ses dimensions.

## Media query, ou variante bureau

Un site peut déclarer un second rendu (`desktopRender` dans ses capacités), et
un bloc peut alors porter un `<Nom>.desktop.astro` à côté de son composant. Les
deux outils ne servent pas la même chose.

| Ce que tu veux | Ce que tu écris |
|---|---|
| la même mise en page, respirant davantage | une media query dans le composant |
| deux, trois colonnes là où il y en avait une | une media query, tant que l'ordre du HTML ne change pas |
| une mise en page réellement différente — ordre, hiérarchie, ce qui porte l'attention | une variante bureau |

La règle : **tant que la maquette bureau est la maquette mobile à laquelle on a
donné de la place, c'est une media query.** Le jour où l'on se surprend à
écrire du CSS pour défaire ce que le mobile impose — réordonner par `order`,
sortir un élément de son flux, masquer puis réafficher — c'est qu'il fallait
une variante.

Une variante n'a besoin d'aucune media query : elle n'est servie qu'au bureau.

**Ce qu'une variante n'a pas le droit de faire :** montrer ce que le mobile ne
montre pas. Un texte, un lien ou une métadonnée présent au seul bureau ne sera
jamais indexé, Google indexant au robot smartphone. `basalte check --build` le
compare et le nomme.

## Le chrome

L'en-tête et le pied de page suivent toutes ces règles — tokens, plancher,
variante bureau, contrat des deux rendus — et deux qui leur sont propres.

**Le nom du site reste écrit en toutes lettres, même sous un logo.** Le texte
alternatif d'une image n'est pas du contenu indexé : un rendu qui n'afficherait
que l'image perdrait ces mots-là, et le contrat des deux rendus ne le dirait
pas — il ne signale que ce que le bureau porte *en trop*.

**L'en-tête est collant** (D187). Son voile se compose de deux tokens —
`color-mix(in srgb, var(--color-bg) 78%, transparent)` —, et il n'est posé que
sous un `@supports (backdrop-filter: …)` : translucide sans flou, le texte de la
page traverserait la barre. `src/astro/base.css` porte le `scroll-padding-top`
qui va avec, sans quoi toute ancre — à commencer par les trois réponses `:target`
du bloc `contact` — arriverait sous elle.

**Le menu s'ouvre sans script.** C'est un `<details>` natif, et l'invariant 5
tient donc sans même passer par l'opt-in. Sur un site à un rendu, la media
query qui le déplie au large porte **deux** règles : les moteurs anciens
masquent le contenu replié par `display`, les récents par `content-visibility`
sur `::details-content`. N'écrire que la première donne un menu qui s'ouvre
dans un navigateur et reste vide dans l'autre.

**Le chrome ne porte aucun titre.** Le nom du site n'est ni `h1` ni `h2` : il
est sur toutes les pages, et en faire un titre donnerait à chacune le même, qui
n'en décrirait aucune. Le `h1` est le titre de la première section visible
(D115), et `basalte check --build` avertit d'une page qui n'en a pas.

## Pratiques de landing

Courtes, et elles ne remplacent pas ta DA. Ce sont des repères, pas des règles.

- **Un seul objectif par page**, donc une seule action principale, répétée.
  Deux appels à l'action concurrents en annulent un.
- Le bandeau dit, dans cet ordre : **ce que c'est, pour qui, quoi faire**.
- **Alterner le rythme** des sections. Trois grilles identiques à la suite se
  lisent comme une seule.
- **Point focal réglé** sur toute image contenant un visage ou un produit,
  sinon le cadrage mobile coupe le sujet.
- Le pied de page porte les mentions légales et le second chemin de contact.

## Implémenter une maquette

La skill `design` du dépôt client fait, dans cet ordre :

1. relève dans la maquette ce qui est **token** et ce qui est **structure**
2. ajuste les tokens de `site.config.ts` — jamais le CSS d'un bloc
3. si la structure est nouvelle, crée un bloc (`nouveau-bloc`)
4. vérifie le plancher ci-dessus, puis `basalte check`

Si une maquette impose une valeur qu'aucun token ne porte, l'arbitrage se fait
là et pas ailleurs : soit la maquette s'aligne sur l'échelle, soit l'échelle
gagne une valeur. Jamais un `padding: 27px` isolé dans un bloc.
