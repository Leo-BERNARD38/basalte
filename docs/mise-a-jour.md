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

**Bumper sans taguer est la panne discrète de cette mécanique.** Le socle
continue de fonctionner, `npm run verify` passe, et c'est `basalte init` qui
tombe — chez un client, après avoir écrit son dépôt. Il refuse donc désormais
avant d'écrire quoi que ce soit, en nommant le tag manquant. `--no-install`
reste le moyen d'engendrer un dépôt sans l'installer.

C'est pourquoi la publication n'est pas une suite de commandes à retenir, mais
une commande à elle seule (D142) :

```bash
basalte release minor
```

### Deux passes, et c'est voulu

La première fois, la note de version n'existe pas : la commande en écrit le
gabarit, affiche la table des rangs et les commits que la version emporte, puis
s'arrête sans rien publier. Tu remplis la note. La seconde fois, elle publie.

Ce qu'aucune commande ne décide à ta place tient en deux choses — le rang, et
ce que la version change pour un site existant. Tout ce qui les entoure, elle
le refuse.

### Ce qu'elle refuse, avant d'écrire quoi que ce soit

- un dossier qui n'est pas le dépôt du socle ;
- un arbre de travail qui porte autre chose que la note en cours — elle seule
  est attendue non commitée, puisque c'est la commande qui vient de la demander ;
- une autre branche que `main`, ou un clone en retard sur `origin/main` ;
- un git qui ne sait pas qui commite ;
- un numéro qui n'est pas postérieur à la dernière version publiée ;
- un tag resté dans le clone d'une publication qui n'a pas abouti ;
- une note dont la ligne « Action requise » ne se lit pas ;
- une note `manuelle` publiée autrement qu'en majeure.

Un cas mérite d'être nommé : quand `package.json` porte déjà un numéro que
personne n'a tagué — la panne ci-dessus, constatée après coup — la commande
refuse le rang demandé et nomme la version qu'il reste à publier.

### Puis, dans cet ordre, et tout ou rien

1. `npm run verify` — il doit passer avant tout le reste
2. le numéro dans `package.json` et `package-lock.json`, relu après écriture
3. `git commit` de ces deux fichiers et de la note, en `release: vX.Y.Z`
4. le tag annoté `vX.Y.Z`
5. `git push --atomic origin main vX.Y.Z`

Si une étape lâche avant le push, la commande défait tout : le tag, le commit,
le numéro. **Sauf la note**, écrite à la main — une commande qui l'effacerait
ferait perdre le seul travail de ce geste qu'elle ne sait pas refaire.

**Le push nomme les deux références, et `--atomic` les fait avancer ensemble ou
pas du tout.** `git push --follow-tags` ne suffit pas : il n'emporte que les
tags annotés, si bien qu'un `git tag vX.Y.Z` suivi d'un `--follow-tags` pousse
la branche et laisse le tag derrière — la panne discrète, produite par la
procédure censée l'éviter.

### Choisir le rang

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
