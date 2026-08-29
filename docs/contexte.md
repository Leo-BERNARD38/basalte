# Contexte et contraintes

## Le besoin

Trois clients (davantage à terme) veulent une landing page qu'ils puissent
**modifier eux-mêmes** : textes, images, ordre et visibilité des sections.

La direction artistique, les blocs et la template complète de départ sont
produits en amont. Le client ne compose qu'avec ce vocabulaire.

Ce dépôt n'est pas un site : c'est le **socle** réutilisable qui permet de
produire ces sites sans tout recommencer à chaque fois.

## Vocabulaire

Trois acteurs, à ne pas confondre :

- **Toi** — tu produis la DA, les blocs et la template de départ, et tu
  maintiens le socle.
- **Le client** — la personne qui édite son site via le panel. Elle ne voit
  jamais de code.
- **Le dépôt client** — le dépôt git d'un site donné. Il peut contenir des
  blocs sur mesure, écrits par toi, dans `src/blocks/`. Le client final n'y
  touche pas.

Le socle est publié sous le nom npm `@leobernard/basalte`. Dans la prose, il
reste désigné par le nom commun « le socle ».

## Les quatre contraintes fondatrices

| # | Contrainte | Conséquence directe |
|---|---|---|
| C1 | SEO au plus haut niveau | HTML pré-rendu, servi depuis le disque, aucun contenu injecté au runtime |
| C2 | Performances | Zéro JavaScript par défaut ; images traitées automatiquement |
| C3 | Sécurité : ne pas se faire pirater, et qu'un intrus ne puisse pas « tout modifier » | Site public sans base ni serveur applicatif ; isolation par client ; plafond de dégâts borné par construction |
| C4 | Très adapté à une utilisation avec Claude Code | Contenu en fichiers texte versionnés, schémas explicites, un seul langage, build comme test |

Ces quatre contraintes convergent vers la même architecture, ce qui est le
principal indice qu'elle est la bonne.
