# Mettre à jour un site

## La commande

Depuis le dépôt du client :

```bash
npm run update
```

Elle enchaîne, dans cet ordre :

1. lit la dernière version publiée du socle — les tags du dépôt, par
   `git ls-remote`
2. affiche les notes de chaque version traversée — ce qui change, et si une
   action est requise
3. épingle la nouvelle version, puis installe
4. applique les migrations de contenu si le format a changé
5. valide tous les contenus, puis construit le site
6. commit

Le commit emporte `.claude/basalte.md` avec le reste : l'installation vient de
le réécrire à la nouvelle version (D89), et le laisser dehors salirait l'arbre
de travail — sur la machine du mainteneur, où la commande suivante refuserait
alors de commencer, et sur le VPS, où le `git pull --ff-only` de `deploy` et le
rebase du panel s'arrêteraient net.

## Elle réussit, ou elle n'a pas eu lieu

Si une seule étape échoue, la commande **annule tout** : `package.json`,
`package-lock.json`, contenu migré, tout revient à l'état d'avant. Le dépôt
reste propre et le message d'erreur nomme l'étape qui a lâché.

Un site à moitié migré est le pire état possible. La commande ne peut pas y
laisser le dépôt.

Ce qui rend cette annulation totale est sa garde de départ : **l'arbre de
travail doit être propre** (D94). Sur un dépôt qui porte déjà des modifications,
rendre les chemins touchés à leur état d'avant effacerait un travail que
la commande n'a pas écrit. Elle refuse donc de commencer, et le dit.

Rien n'est mis en ligne : `update` prépare le dépôt. C'est la publication qui
remplace le site, et le site en ligne ne bouge pas d'ici là.

## Voir sans faire

```bash
npm run update -- --dry-run
```

Affiche la version cible, les notes, les migrations qui s'appliqueraient et les
fichiers qui changeraient. N'écrit rien.

## Publier une version du socle

**Le tag est la publication.** Rien d'autre ne l'est : pas le numéro dans
`package.json`, pas la note dans `notes/`, pas un commit sur `main`. Un dépôt
client s'installe par `github:<compte>/basalte#vX.Y.Z` (D5), et ce que ce tag ne
désigne pas n'existe pas pour lui.

D'où l'ordre, depuis le dépôt du socle :

```bash
npm run verify                       # il doit passer avant tout le reste
# porter le numéro dans package.json, écrire notes/vX.Y.Z.md
git commit -am "release: vX.Y.Z"
git tag vX.Y.Z
git push origin main --follow-tags
```

**Bumper sans taguer est la panne discrète de cette mécanique.** Le socle
continue de fonctionner, `npm run verify` passe, et c'est `basalte init` qui
tombe — chez un client, après avoir écrit son dépôt. Il refuse donc désormais
avant d'écrire quoi que ce soit, en nommant le tag manquant. `--no-install`
reste le moyen d'engendrer un dépôt sans l'installer.

Le numéro se choisit sur **ce qu'un site existant a à faire**, pas sur la
quantité de travail accompli. C'est la même échelle que la première ligne des
notes, à un cran près :

| Rang | Ce qui change pour un site existant | « Action requise » |
|---|---|---|
| **patch** | rien — une correction, un texte, une performance | `aucune` |
| **mineure** | des blocs, des champs ou des capacités s'ajoutent ; une migration de format tourne toute seule | `aucune` ou `automatique` |
| **majeure** | quelque chose doit être touché à la main dans le dépôt client | `manuelle` |

Un numéro qui n'est pas du semver strict est ignoré par `update` : le socle n'en
publie pas d'autres, et un tag mal formé passerait inaperçu.

## Notes de version

Chaque version du socle porte ses notes dans `notes/vX.Y.Z.md`, au format fixe,
pour rester lisibles autant par toi que par un agent (D90). Le fichier est
livré dans le paquet — les notes de la version installée se lisent donc hors
ligne — et lu sur le dépôt public pour les versions qu'on n'a pas encore :

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

```bash
npm run update -- --json
```

rend `{ from, to, action, notes, steps }` — `action` étant la plus forte
exigence de toutes les versions traversées.

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
