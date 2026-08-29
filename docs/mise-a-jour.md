# Mettre à jour un site

## La commande

Depuis le dépôt du client :

```bash
npm run update
```

Elle enchaîne, dans cet ordre :

1. lit la dernière version publiée du socle
2. affiche les notes de version — ce qui change, et si une action est requise
3. installe la nouvelle version
4. applique les migrations de contenu si le format a changé
5. valide tous les contenus, puis construit le site
6. commit

## Elle réussit, ou elle n'a pas eu lieu

Si une seule étape échoue, la commande **annule tout** : `package.json`,
`package-lock.json`, contenu migré, tout revient à l'état d'avant. Le dépôt
reste propre et le message d'erreur nomme l'étape qui a lâché.

Un site à moitié migré est le pire état possible. La commande ne peut pas y
laisser le dépôt.

Rien n'est mis en ligne : `update` prépare le dépôt. C'est la publication qui
remplace le site, et le site en ligne ne bouge pas d'ici là.

## Voir sans faire

```bash
npm run update -- --dry-run
```

Affiche la version cible, les notes, les migrations qui s'appliqueraient et les
fichiers qui changeraient. N'écrit rien.

## Notes de version

Chaque tag du socle porte des notes au format fixe, pour rester lisibles autant
par toi que par un agent :

```md
## v1.5.0

**Action requise :** aucune

### Ce qui change
- …

### Migration de contenu
Aucune.

### À faire dans le dépôt client
Rien.
```

Trois règles pour les écrire :

- **« Action requise »** vaut `aucune`, `automatique` ou `manuelle`. Rien
  d'autre : c'est la ligne que l'on lit en premier.
- On décrit **l'effet sur un site existant**, jamais le travail accompli dans
  le socle.
- Une note ne renvoie ni à un commit ni à une issue : elle se suffit.

## Mise à jour assistée

`basalte init` dépose une skill `mettre-a-jour` dans le dépôt client. Elle
fait, dans l'ordre :

1. `npm run update -- --dry-run`
2. relit les notes de version et les traduit en français simple
3. signale ce qui demande une décision
4. lance la mise à jour, ou s'arrête et explique pourquoi

Ce qui rend ça possible : la sortie de `basalte update` est structurée, et les
notes de version ont toujours les mêmes titres. C'est la seule raison pour
laquelle ces deux formats sont figés.

## Ordre de déploiement

Invariable :

1. le site de démonstration du socle
2. le client le moins critique
3. les autres

## Plusieurs sites d'un coup

```bash
basalte update-all sites.txt
```

Pour un correctif de sécurité du panel qui doit atteindre tous les VPS
rapidement. La commande s'arrête au premier site en échec au lieu de continuer.

## Quand mettre à jour

Un site figé sur une version ancienne continue de fonctionner. On monte de
version pour un correctif de sécurité, une fonctionnalité demandée, ou à
l'occasion d'une intervention. Jamais « parce qu'il y a une nouvelle version ».
