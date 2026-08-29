# Conventions de code

Ces règles ont une raison précise. Ce dépôt est écrit en grande partie avec
Claude Code, et le défaut le plus coûteux d'un agent n'est pas l'erreur — elle
se voit — mais la **duplication discrète** : une variante locale d'une fonction
qui existe déjà, qui marche, et que personne ne remarquera avant six mois.

Tout ce qui suit sert à rendre la réutilisation plus facile que la réécriture.

## Chercher avant d'écrire

```bash
basalte inventory
```

Sort la liste de tout ce qui est réutilisable — champs `f.*`, blocs, helpers
serveur, composants du panel — avec leur signature, **générée depuis le code**.
Un inventaire écrit à la main est faux en deux semaines ; celui-ci ne peut pas
l'être.

La règle est stricte :

> Avant d'écrire une fonction, la chercher dans l'inventaire. Si une fonction
> proche existe, l'étendre. Écrire une variante locale est un défaut, même
> lorsqu'elle fonctionne.

## Pas de fourre-tout

Pas de `utils.ts`, pas de dossier `helpers/`, pas de `common/`. Un helper vit
dans le dossier de son domaine : `src/fields/`, `src/server/`, `src/seo/`.

Un fourre-tout est un endroit que personne ne lit et où tout le monde ajoute.
C'est mécaniquement là que la duplication s'accumule.

`scripts/`, à la racine, n'est pas une exception : il ne contient pas de code
partagé mais des exécutables autonomes appelés par un script npm, qui ne
s'appellent pas entre eux et que rien de `src/` n'importe.

## Formatage

Prettier s'en charge — `npm run format`, vérifié en pré-commit et en CI. Ne
discute pas d'une mise en forme : lance la commande. La documentation en est
exclue, elle est calibrée à la main (`environnement.md`).

## Un bloc ne valide rien à la main

Toute contrainte sur un contenu passe par `f.*`. Si une vérification manque, on
l'ajoute au DSL — on ne l'écrit pas dans le bloc.

C'est le DSL qui empêche la dispersion, à la seule condition qu'il reste plus
court de l'étendre que de le contourner.

## Commentaires

> Un commentaire décrit **ce qui existe**. Jamais comment on y est arrivé.

Interdits — ils parlent du passé :

```ts
// fix : corrige le bug de la langue par défaut
// on utilise X plutôt que Y, c'était trop lent
// amélioration : gère maintenant aussi les groupes
```

Attendus — ils parlent du présent, et seulement là où le code ne se suffit
pas :

```ts
// Table des médias pour l'optimisation Astro.
// Astro n'optimise que les images importées ; d'où le glob.
```

Le test, six mois plus tard, sans souvenir du contexte : *est-ce que cette
ligne m'apprend quelque chose sur le code tel qu'il est ?* Sinon, elle saute.

Le « pourquoi » d'un choix a un endroit à lui : `decisions.md`. La règle des
commentaires n'est tenable que grâce à ce fichier.

Pas de `TODO` dans le code : ce qui reste à faire va dans `implementation.md`
ou dans une issue, pas dans un fichier source où il vieillira sans être vu.

## Signaux de taille

Aucun n'est un refus. Chacun déclenche une question. *Hypothèse — les seuils se
calibrent sur le vrai code, pas avant.*

| Seuil | Question |
|---|---|
| fichier > 200 lignes | est-ce qu'il fait deux choses ? |
| fonction > 40 lignes | est-ce qu'elle fait deux choses ? |
| troisième paramètre booléen | est-ce que ce sont deux fonctions ? |

## Nommage

Code, noms de fichiers et identifiants en anglais. Libellés d'interface,
messages destinés au client et documentation en français. La frontière est
nette : dès qu'une chaîne s'affiche à l'écran, elle est en français.

Deux suffixes ont un sens pour l'outillage : `*.test.ts` est une suite Vitest,
`*.fixture.ts` un banc d'essai partagé entre plusieurs suites. Les deux sont
écartés du paquet par `tsconfig.build.json` — un banc d'essai ne part jamais
chez un client.

## Apostrophes

Les chaînes et les commentaires français prennent l'apostrophe typographique
(`’`), jamais l'apostrophe droite. Ce n'est pas une coquetterie : les chaînes
de ce dépôt sont délimitées par des apostrophes droites, et la variante
typographique n'a donc jamais besoin d'être échappée. La documentation, elle,
garde l'apostrophe droite — elle n'est pas du code.

## Côté dépôt client

La discipline ci-dessus vaut pour le socle. Un dépôt client, lui, ne contient
aucune logique (`depot-client.md`) : les seules règles qui s'y appliquent sont
de ne jamais y copier de code du socle, et de ne jamais y écrire une valeur de
style en dur (`design.md`). Un besoin non couvert se traite en ajoutant un
point d'extension ici.
