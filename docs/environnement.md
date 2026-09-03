# Environnement de développement

Ce document décrit les machines sur lesquelles le socle s'écrit, et ce qui
garantit qu'elles produisent le même résultat. Ce que la machine de production
exécute est dans `deploiement.md`.

## Trois cibles, un seul dépôt

| Où | Système | Ce qui s'y passe |
|---|---|---|
| ta machine | Windows | développement |
| session cloud | Ubuntu | développement |
| VPS du client | Ubuntu, dans Docker | build et exécution |

Node 24 sur les trois (D33). `.nvmrc` porte la version, `engines` la fait
respecter, et `engine-strict=true` transforme l'avertissement en refus. Une
divergence de runtime entre deux machines de développement se paie en lockfile
réécrit et en pannes qui ne se reproduisent pas.

## Le rituel de clone

```bash
npm install
npm run setup
```

`npm install` compile au passage : le script `prepare` construit `dist/`.
`npm run setup` branche les hooks git, qui ne s'activent pas tout seuls.

Une session Claude Code sur le web n'a rien à faire de tout cela : le hook de
`.claude/` s'en charge (plus bas).

## Les commandes du dépôt

| Commande | Effet |
|---|---|
| `npm run verify` | compile, typecheck, `.astro`, panel, tests, formatage, lockfile |
| `npm run verify:install` | prouve le chemin d'installation depuis git |
| `npm run build` | compile `src/` vers `dist/` |
| `npm test` | Vitest, une fois |
| `npm run test:watch` | Vitest, en continu |
| `npm run format` | applique Prettier |
| `npm run setup` | branche `.githooks/` |
| `npm run demo:dev` | sert le site de démonstration, panel compris, à chaud depuis `src/` |
| `npm run demo:build` | construit le site de démonstration, statique |
| `npm run demo:panel` | construit son panel : sortie serveur, adaptateur Node |
| `npm run demo:check` | typecheck des `.astro` et des `.tsx`, via `@astrojs/check` |

Le site de démonstration n'a ni `package.json` ni entrée `workspaces` (D46) :
Node résout `@leobernard/basalte` par self-reference depuis n'importe quel
sous-dossier du dépôt. Il ressemble donc trait pour trait à un dépôt client
sans coûter l'installation complète qu'un workspace imposerait à chaque VPS —
voir « Ce que npm fait vraiment » plus bas.

`demo:dev` construit `dist/` une fois, parce que la configuration d'Astro
importe l'intégration par son paquet et que le script a besoin de la base
compilée pour créer le compte. Puis tout vient de `src/` : sous `astro dev`,
l'intégration compilée s'efface devant ses sources (D190), et Vite recharge à
chaud un bloc, le panel, une feuille ou un `.tsx` modifiés. Un fichier de
`content/` qui change — enregistré par le panel, retouché à la main, arrivé par
`git pull` — fait réécrire le module généré et l'invalide dans le graphe, sans
redémarrer le serveur (D191) ; la page se recharge sauf quand c'est le panel qui
vient d'écrire. Deux fichiers demandent encore de relancer : `site.config.ts`,
qui décide des routes, et `src/astro/index.ts`, qui est l'intégration
elle-même — et `dist/` doit être reconstruit pour le second.

Astro 7 détecte un agent et lance alors le serveur en arrière-plan, en
attendant un fichier de verrou qui n'arrive pas dans un conteneur : poser
`ASTRO_DEV_BACKGROUND=1` le garde au premier plan. Un développeur dans son
terminal n'a rien à faire.

## Versions épinglées

`.npmrc` porte `save-exact=true` : plus aucun `^` ne peut entrer par un
`npm install` distrait. L'invariant 4 cesse d'être une discipline pour devenir
une propriété du dépôt.

Toutes les versions ci-dessous sont les dernières publiées au 2026-08-29, sauf
deux exceptions, signalées et motivées.

**Ce que le client exécute** — en `dependencies`, donc présent sur chaque VPS :

| Paquet | Version | |
|---|---|---|
| `astro` | 7.2.9 | en `peerDependencies`, exacte — voir plus bas |
| `@astrojs/node` | 11.1.4 | l'adaptateur SSR du panel |
| `@astrojs/react` | 6.0.4 | expose l'option `babel`, d'où le compilateur |
| `react`, `react-dom` | 19.2.8 | |
| `babel-plugin-react-compiler` | 1.0.0 | activé dès le départ |
| `@mantine/core`, `@mantine/hooks` | 9.5.2 | exigent `react: ^19.2.0` |
| `@dnd-kit/core` | 6.3.1 | |
| `@dnd-kit/sortable` | 10.0.0 | |
| `zod` | 4.5.2 | |
| `sharp` | 0.35.4 | |
| `@node-rs/argon2` | 2.1.0 | hachage des mots de passe, liaison napi préconstruite (D48) |
| `@types/react`, `@types/react-dom` | 19.2.18, 19.2.5 | en dépendances, pas en dev : les `.d.ts` livrés y renvoient |

La base SQLite n'apparaît pas dans cette liste : c'est `node:sqlite`, intégré à
Node 24 (D47). Une dépendance de moins, et une famille de binaires de moins à
faire coexister dans le lockfile.

**Outillage** — en `devDependencies` :

| Paquet | Version | |
|---|---|---|
| `typescript` | 6.0.3 | pas 7 — voir ci-dessous |
| `@astrojs/check` | 0.9.10 | typecheck des `.astro` |
| `vitest` | 4.1.11 | |
| `prettier`, `prettier-plugin-astro` | 3.9.6, 0.14.1 | |
| `@types/node` | 24.13.3 | pas 26 — voir ci-dessous |

### Les deux versions qui ne sont pas les dernières

**TypeScript 6, pas 7.** 7.0.2 est `latest`, mais `@astrojs/check@0.9.10` —
publié le 2026-07-27, donc à jour — déclare `typescript: ^5.0.0 || ^6.0.0`. Le
typecheck des `.astro` casserait dès le premier bloc. Ce n'est pas une prudence
de notre part, c'est le plafond de l'outillage Astro. Le déclencheur de montée
est clair : le jour où `@astrojs/check` accepte `^7`.

**`@types/node` 24, pas 26.** Les types doivent décrire le runtime : monter en
26 ferait passer le typecheck sur des APIs que Node 24 n'a pas, et la panne
n'apparaîtrait qu'à l'exécution. Ils suivent `.nvmrc`, jamais `latest`.

### Le compilateur React

`@astrojs/react` accepte une option `babel` et la passe telle quelle à
`@vitejs/plugin-react` — vérifié dans ses types :
`Pick<ViteReactPluginOptions, 'include' | 'exclude' | 'babel'>`. Le compilateur
s'active donc sans détour, dans l'intégration du socle.

Une précision qui ne se devine pas : `@vitejs/plugin-react` **exclut
`node_modules` par défaut** (`defaultExcludeRE = /\/node_modules\//`). Or le
panel y vit, puisqu'il arrive dans le paquet. Sans réglage, le compilateur ne
verrait donc jamais le seul React du projet. L'intégration remplace l'exclusion
par « tout `node_modules` sauf `@leobernard/basalte` », et retire le paquet de
la pré-optimisation de Vite pour que le développement se comporte comme le
build. À revérifier à chaque montée de `@vitejs/plugin-react`.

`react-compiler-runtime` n'est pas installé : il ne sert qu'à React 17 et 18,
dont les APIs manquantes sont natives à partir de 19.

### `astro` en dépendance de pair

Le dépôt client déclare `astro` et lance `astro build` ; le socle ne fournit que
l'intégration. Deux copies d'Astro donneraient deux instances de Vite, donc une
intégration chargée deux fois et un `import.meta.glob` incohérent. En
`peerDependencies` **à la version exacte**, une divergence échoue bruyamment à
l'installation plutôt que de se dupliquer en silence. Le socle la garde aussi en
`devDependencies`, à la même version, pour ses propres tests.

## Le lockfile porte les deux systèmes

Rollup, rolldown, lightningcss, esbuild et sharp publient un binaire compilé par
plateforme, en dépendance optionnelle. Un lockfile qui n'en porte qu'une fait
échouer `npm ci` de l'autre côté sur un module introuvable — et le déploiement
utilise `npm ci`, jamais `npm install`.

Constat au 2026-08-29 avec npm 11.17, sharp installé : un `npm install` lancé
sous Windows inscrit **toutes** les plateformes — 107 dépendances optionnelles
déclarées, aucune absente. Le défaut d'élagage que la documentation de sharp
signale encore ne s'est pas reproduit. On ne s'en remet pas à ce constat :
`npm run lockfile:check` le revérifie à chaque `verify` et à chaque `push`.

La règle appliquée est exacte, pas heuristique : **toute dépendance optionnelle
déclarée par un paquet du lockfile doit y avoir sa propre entrée.** C'est
précisément ce qu'un élagage détruit.

Une règle par symétrie de plateformes — « chaque famille doit couvrir
`linux-x64` et `win32-x64` » — a été essayée et jetée : elle signale
`@img/sharp-libvips` comme incomplet, alors que l'asymétrie est légitime.
`@img/sharp-win32-x64` n'a **aucune** dépendance, libvips étant lié
statiquement dans le binaire Windows, là où `@img/sharp-linux-x64` tire
`@img/sharp-libvips-linux-x64`. Le script affiche encore cette couverture, mais
pour lecture seulement.

S'il réapparaît, dans cet ordre :

```bash
npm install --package-lock-only --os=linux --cpu=x64 --libc=glibc
npm install --package-lock-only --os=win32 --cpu=x64
```

et si cela ne tient pas, déclarer les paquets de plateforme en
`optionalDependencies` explicites du `package.json` : ils deviennent des
dépendances réelles, présentes des deux côtés, et npm ignore à l'installation
celles dont les contraintes `os` et `cpu` ne correspondent pas.

Corollaire pour la machine : image Docker en base **glibc**
(`node:24-bookworm-slim`). Alpine ajouterait musl comme troisième famille à
faire coexister dans le même lockfile.

## Fins de ligne et casse des noms

`.gitattributes` impose `eol=lf`, quelle que soit la valeur de `core.autocrlf`
sur la machine. Sans lui, deux machines réglées différemment se renvoient des
diffs entiers. Le cas qui fait vraiment mal est plus discret : un fichier de
`.githooks/` ou le `bin` du CLI commité en CRLF échoue sous Ubuntu sur
`bad interpreter: /usr/bin/env node^M`.

Windows ne distingue pas la casse des noms de fichiers, Ubuntu si.
`blocks/Hero/` importé depuis `blocks/hero/` fonctionne ici et casse là-bas.
`forceConsistentCasingInFileNames` l'attrape au typecheck, la matrice de CI
l'attrape pour le reste. Un renommage de casse pure demande `git mv --force`.

## Formatage

Prettier, sans linter généraliste (D36). Pas de point-virgule, guillemets
simples, 80 colonnes — c'est la forme des exemples de `modele-contenu.md`.

La documentation en est exclue : elle est écrite à la main sur 79 colonnes, et
Prettier aligne les tableaux cellule par cellule, ce qui allonge des lignes déjà
longues sans rien apporter. Ses fins de ligne sont tenues par `.gitattributes`.

Les règles qui comptent vraiment ici — valeur de style en dur dans un bloc,
validation écrite à la main, fourre-tout — ne s'expriment pas en règles de
linter généraliste : elles parlent de blocs, de tokens et de schémas, que seul
ce dépôt connaît. Elles vont dans `basalte lint`, qui les refuse à l'endroit
fautif et nomme le token à employer (`conventions.md`). La duplication, elle,
n'y est toujours pas, et la mesure dit pourquoi : vingt-et-un noms de fonctions
exportées apparaissent deux fois sous `src/`, dont la grande majorité est
l'appariement voulu entre une route du panel et son appel côté navigateur. Une
règle à ce taux de fausses alertes s'ignore, ce qui est pire que pas de règle
(D145). C'est la skill « reutiliser » qui porte le geste, à la relecture d'une
diff.

## Hooks git

`.githooks/`, branchés par `npm run setup` plutôt que par une dépendance
(D37) :

| Hook | Ce qu'il lance |
|---|---|
| `pre-commit` | `format:check` puis `typecheck` |
| `pre-push` | tests puis `lockfile:check` |

Ils ne sont pas le garde-fou — la CI l'est. Un clone où `setup` a été oublié
n'est pas cassé, il est seulement moins prévenant.

Le bit exécutable ne se pose pas depuis Windows : un hook ajouté ici a besoin
d'un `git update-index --chmod=+x` pour être lu sous Ubuntu.

## Intégration continue

`.github/workflows/pr.yml`, sur les pull requests seulement (D38). Deux jobs :

| Job | Où | Ce qu'il prouve |
|---|---|---|
| `verify` | ubuntu **et** windows | le dépôt se comporte pareil des deux côtés |
| `lockfile` | ubuntu | le lockfile porte les deux plateformes |

Le job `verify` lance `npm run verify` — la même commande, dans le même ordre,
que celle du poste de développement. Il finit par `verify:install`, qui fabrique
un dépôt git jetable
depuis le dossier de travail, y installe le socle comme le ferait un dépôt
client, vérifie que chaque cible de `exports` est bien dans le paquet, puis
lance `basalte --version`. Il prouve d'un coup que `prepare` compile, que
`files` livre ce qu'il faut, que `bin` est branché et que le shebang a survécu —
la surprise que `architecture.md` annonçait pour la livraison, désamorcée à
chaque PR.

Il travaille sur un clone local : aucune dépendance au réseau, ni à la
visibilité du dépôt. Et il tourne sur les deux systèmes, ce qui couvre le shim
`.cmd` que npm installe pour un `bin` sous Windows.

Toute la logique est dans les scripts npm, aucune dans le YAML : ce que la CI
lance se relance à la main, à l'identique. La règle avait dérivé — le YAML
portait sa propre liste, qui omettait `demo:check`, et le panel n'était
construit nulle part. Il l'est maintenant à chaque `verify`, et c'est ce qui
compte le plus : le panel est l'artefact que `docker-entrypoint.sh` construit au
démarrage d'un conteneur, et un échec là empêche le site de démarrer.

## L'ordre de `verify`

Il n'est pas indifférent. `npm run build` vient en premier parce que
`tsc --noEmit` résout `@leobernard/basalte` vers `dist/` : un `dist/` périmé
fait échouer le typecheck sur des messages qui ne parlent pas du vrai problème.
Vient ensuite ce qui est rapide et parle clair — typecheck, `.astro` —, puis les
deux constructions, puis les tests.

## L'amorçage d'une session sur le web

`.claude/hooks/session-start.sh`, branché par `.claude/settings.json` (D125).
Il ne s'exécute que là — `CLAUDE_CODE_REMOTE` le garde —, si bien qu'il est
invisible sur le poste du mainteneur.

Ce qu'il fait : installer la version de `.nvmrc` par le gestionnaire présent,
poser le `PATH` obtenu dans `CLAUDE_ENV_FILE` pour que la session en hérite,
puis jouer le rituel de clone. Sans lui, une machine restée en Node 22 se heurte
à `engine-strict=true` et n'installe rien du tout — rien ne se lance, et la
cause n'est pas évidente.

Il ouvre `nvm.sh` sous `--no-use`. En s'ouvrant, nvm active la version par
défaut et rend 3 quand elle n'est pas installée — c'est-à-dire toujours, sur la
machine qu'il est là pour équiper. Sous `set -e`, ce code de retour tuait le
script entier avant la moindre installation, sans un mot : la session repartait
sur le Node du conteneur, `npm ci` refusait de s'exécuter, et rien ne disait
pourquoi. Un hook qui prépare une machine ne peut pas mourir de la panne qu'il
corrige.

Il emploie `npm ci`, là où un hook de démarrage prendrait plutôt `npm install`
pour profiter du cache de conteneur : le lockfile de ce dépôt est un artefact
versionné qui porte les binaires de deux plateformes, et `npm install` sous
Linux en élaguerait ceux de Windows — la panne exacte que `lockfile:check`
surveille. Le coût est amorti par une empreinte du lockfile : la deuxième
session ne réinstalle rien.

## Ce que npm fait vraiment quand un client installe le socle

Vérifié dans le source de npm 11.17, parce que le comportement est
contre-intuitif et qu'il conditionne le contenu du `package.json`.

Installer une dépendance git n'est pas installer un paquet du registre.
`pacote/lib/git.js` clone le dépôt, puis :

- **Un `npm install --force` complet a lieu dans le clone**, chez le client, à
  chaque installation. Il est déclenché par la simple *présence* de l'une de ces
  clés dans `scripts` — `prepare`, `postinstall`, `preinstall`, `install`,
  `prepack`, **`build`** — ou du champ `workspaces`. `build` n'est pourtant
  jamais exécuté par npm comme étape de cycle de vie : sa seule présence suffit.
  Mettre `examples/demo` en workspace npm coûterait donc une installation
  complète à chaque `npm ci` de chaque VPS.
- **`--omit=dev` est sans effet.** `pacote/lib/fetcher.js` force
  `--include=dev --include=peer --include=optional`, avec le commentaire
  « override any omit settings from the environment ». Toutes les
  devDependencies du socle sont installées sur chaque VPS. C'est le prix de la
  liste de devDependencies : la garder courte n'est pas une coquetterie.
- **`--ignore-scripts` produit une installation muette et cassée.**
  `git.js` ne teste pas cette option, contrairement à `dir.js` : les
  dépendances sont installées, `prepare` est sauté sans erreur, et le package
  arrive sans `dist/`. La panne se manifeste plus tard, en
  `ERR_MODULE_NOT_FOUND`. `--ignore-scripts` est donc interdit sur un VPS.
- **Une dépendance git n'a pas d'`integrity` au lockfile.** Le
  `package-lock.json` fige le commit résolu, pas le contenu produit : le chemin
  entier est rejoué à chaque cache froid, donc à chaque build Docker.
- **npm 11 filtre les scripts d'installation.** Une installation du socle
  affiche `npm warn allow-scripts … (prepare: node scripts/build.mjs)` et
  invite à lancer `npm approve-scripts`. Avec le réglage par défaut
  (`strict-allow-scripts=false`) le script s'exécute quand même — vérifié, le
  paquet arrive complet. Mais l'avertissement est visible par le client, et le
  jour où ce réglage devient strict, `prepare` serait bloqué et le paquet
  arriverait sans `dist/`. C'est ce que `verify:install` surveille.

Deux conséquences pour la suite. La liste des devDependencies est un coût payé
par chaque client — on ne l'allonge pas sans raison. Et le jour où le script
`build` serait renommé ou supprimé, il faudrait vérifier qu'aucune des six clés
ci-dessus ne subsiste par inadvertance.

## Ce que Node 24 sait faire, et ce qu'il refuse

`process.features.typescript` vaut `strip` : Node exécute un fichier `.ts`
directement, en effaçant les types, sans transformer quoi que ce soit d'autre.
C'est ce qui permettra au CLI de lire le `site.config.ts` et les
`src/blocks/*/schema.ts` d'un dépôt client sans compilateur.

Mais **le stripping est désactivé sous `node_modules`** — le binaire de Node
porte le message `Stripping types is currently unsupported for files under
node_modules`. Tout ce que Node charge lui-même depuis le package installé doit
donc être du JavaScript : le `bin`, et plus tard `src/server/`. C'est ce qui
rend la compilation obligatoire, et non une préférence.

Deux réglages du `tsconfig.json` en découlent, et ils ne sont pas cosmétiques :

- `verbatimModuleSyntax` impose `import type`. Le mode `strip` n'élide pas les
  imports : `import { Foo }` où `Foo` est un type devient une erreur au
  démarrage. Le socle vit sous la contrainte qu'il imposera à ses clients.
- `erasableSyntaxOnly` interdit `enum`, `namespace` et les paramètres-propriétés
  — la syntaxe que le stripping ne sait pas effacer. Sans lui, rien n'empêche le
  DSL d'exposer une construction qu'un `schema.ts` de dépôt client ne pourrait
  pas utiliser.

Le panel ajoute `jsx: react-jsx` et la bibliothèque `dom` : c'est ce qui permet
au même `tsc` de compiler les `.tsx` du panel et le reste du socle. Les deux
familles de types coexistent sans conflit — vérifié, `@types/node` 24 et
`lib.dom` ne se disputent ni `Request`, ni `Response`, ni `fetch`.

## `scripts/`

Outillage du dépôt, jamais du code livré : absent de `files`, et rien de `src/`
ne l'importe. Ce n'est pas le fourre-tout que D22 interdit — un fourre-tout est
un endroit où l'on range du code partagé, alors qu'ici chaque fichier est un
exécutable autonome appelé par un script npm, et rien ne s'y appelle entre soi.
