---
name: reutiliser
description: Relire une diff du socle pour y trouver ce qui existait déjà ailleurs.
---

Le défaut le plus coûteux d'un agent n'est pas l'erreur — elle se voit — mais
la **duplication discrète** : une variante locale d'une fonction qui existe
déjà, qui marche, et que personne ne remarquera avant six mois.

`basalte lint` ne l'attrape pas, et n'y arrivera pas : mesuré sur ce dépôt,
vingt-et-un noms de fonctions exportées apparaissent deux fois sous `src/`, et
la grande majorité est l'appariement voulu entre une route du panel et son
appel côté navigateur — `changePassword`, `uploadMedia`, `signIn`. Une règle à
ce taux de fausses alertes s'ignore, ce qui est pire que pas de règle.

`basalte inventory` ne t'aide pas non plus ici : il liste ce qu'un **dépôt
client** réutilise — les types `f.*` et les blocs. Celui qui écrit le socle n'y
trouve rien de ce qu'il cherche.

Il reste donc la lecture. Ceci en est le geste.

## Quand

Avant de dire qu'un travail est fini, sur `git diff` — pas fonction par
fonction pendant qu'on écrit, où l'on manque le recul.

## Chaque fonction ajoutée passe deux questions

1. **Ce nom existe-t-il déjà ?**
   `grep -rn "function <nom>" src/` — s'il répond, lis les deux et tranche.
2. **À quel domaine appartient-elle vraiment ?** Le dossier où on la
   chercherait dans six mois. Si ce n'est pas celui où tu l'as écrite, elle est
   au mauvais endroit, et c'est là que la prochaine copie naîtra.

## Où la duplication se loge dans ce dépôt

Un domaine par dossier, et quatre points de passage obligés :

| Ce que tu écris | Ce qui existe déjà |
|---|---|
| une sortie de commande, un drapeau, un code de retour | `src/cli/args.ts` |
| un appel à git, quel qu'il soit | `src/server/git.ts` — le seul endroit qui lance la commande |
| un nom de page, de route, de fichier de contenu | `src/content/naming.ts` |
| ce qui distingue les deux supports | `src/render/supports.ts` |

Pour le reste, la table de `CLAUDE.md` dit ce que chaque dossier de `src/`
porte. Un helper vit dans le dossier de son domaine, jamais dans un
fourre-tout — `lint` refuse déjà le fourre-tout, il ne sait pas refuser le
mauvais domaine.

## Ce qui n'est pas de la duplication

Deux fonctions de même nom ne sont pas toujours une de trop. `errorsOf` existe
dans `src/content/project.ts` et dans `src/lint/finding.ts` : deux filtres
d'une ligne, sur deux types qui n'ont en commun qu'un champ `severity`. Les
réunir demanderait un module qui n'appartient à aucun des deux domaines —
c'est-à-dire un fourre-tout, et l'amorce exacte de ce que la règle interdit.

L'épreuve n'est donc pas la ressemblance, c'est celle-ci : **est-ce qu'une
correction de l'une devra être portée dans l'autre ?** Si oui, c'en est une de
trop. Si non, laisse-les.

## Ce que tu fais de ce que tu trouves

Étendre l'existante, jamais l'imiter. Et si l'étendre demande un troisième
paramètre booléen, ce sont deux fonctions — pas une plus large.
