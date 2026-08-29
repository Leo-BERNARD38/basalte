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

Elle est vérifiable : `basalte check` refuse une couleur ou une longueur
littérale dans le CSS d'un bloc.

## Les tokens

Déclarés dans `site.config.ts`, injectés en variables CSS sur `:root`. La liste
est courte exprès — elle doit tenir dans la tête.

Établie en phase 1 et vérifiable : `resolveTokens` refuse une famille ou un nom
que le socle ne porte pas, ce qui rend l'arbitrage impossible à contourner par
distraction. Un site ne déclare que ce que sa DA change ; le reste vient du
socle.

| Famille | Tokens |
|---|---|
| Couleurs | `--color-bg` `--color-fg` `--color-muted` `--color-accent` `--color-accent-fg` `--color-border` `--color-danger` |
| Typographies | `--font-title` `--font-body` |
| Échelle de texte | `--text-xs` `--text-sm` `--text-base` `--text-lg` `--text-xl` `--text-2xl` `--text-3xl` |
| Espacement | `--space-1` → `--space-8`, de 0,25 à 4,5 rem |
| Rayons | `--radius-sm` `--radius-md` |
| Largeurs | `--width-content` `--width-wide` |

Un besoin qui ne rentre pas dans cette liste est un token à ajouter au socle,
jamais une valeur en dur dans un bloc.

C'est ce qui fait que le même bloc `hero` a une allure radicalement différente
d'un client à l'autre sans qu'une ligne de son code change.

## Plancher, non négociable

Il s'applique à tout bloc, sur mesure comme de référence.

- **Mobile d'abord.** La maquette doit tenir à 375 px de large avant toute
  autre chose. Les media queries montent, elles ne descendent pas.
- **Contraste** de 4,5:1 minimum sur le texte. Deux tokens de couleur qui ne
  passent pas ensemble sont un défaut de DA, à corriger dans les tokens.
- **Focus visible.** Jamais `outline: none` sans remplacement.
- **Cibles tactiles** de 44 px minimum.
- **Texte alternatif** sur chaque image — il est déjà obligatoire au
  téléversement.
- **Aucun JavaScript** sauf si le bloc le déclare explicitement. Un bloc
  interactif charge son script, la page n'en charge aucun autre.
- **Pas de décalage de mise en page** : toute image porte ses dimensions.

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
