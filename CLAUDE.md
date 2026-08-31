# basalte

Socle technique pour landing pages éditables par leurs propriétaires.
Package npm `@leobernard/basalte`, installé depuis git par tag dans un dépôt
par site — dépôt public, jamais publié sur le registre npm.

**État :** les six phases, et les phases 7 à 10, sont faites. Phase 1 — DSL
de champs, moteur de blocs, intégration Astro, médias, `basalte check` et
`basalte inventory` ; le site de démonstration se construit depuis son JSON
(`examples/demo`). Phase 2 — le flux d'authentification entier, jusqu'à
`basalte admin:login`. Phase 3 — le panel : formulaires produits depuis les
schémas, enregistrement avec commit, médiathèque, réordonnancement, visibilité
par langue, aperçu. Phase 4 — la mise en ligne : rebase, build en processus
enfant, bascule atomique, push, file à une place, et un échec qui laisse le
site debout. Phase 5 — servir : formulaire de contact sans une ligne de
JavaScript, anti-spam, messages gardés en base avant tout envoi, purge des
données personnelles, audience lue dans les logs de Caddy. Phase 6 — livrer :
`basalte init` et le paquet Claude Code du dépôt client, `deploy`, `doctor`,
`update`, les migrations de format, `update-all`, et les fichiers de la
machine. Phase 7 — outiller : la grammaire enrichie de `f.richtext`, les
documents légaux générés, le PDF téléchargeable, le contexte du site en
`docs/`, le banc de blocs `/__blocs`, les capacités déclarées et les profils
d'`init`. Phase 8 — adapter : deux rendus construits depuis le même contenu et
servis chacun à son support, la variante bureau d'un bloc, et le contrat qui
garantit que le mobile porte tout. Phase 9 — encadrer : l'en-tête et le pied de
page autour de chaque page, dans les deux rendus, remplaçables par site, un
menu qui se déduit des pages tant que personne ne l'a rangé, et le `h1` rendu à
la première section. Phase 10 — cadrer : le ratio d'un champ réellement obtenu
par un recadrage qui est une ingestion, la fiche d'entreprise comme seule source
structurée, `src/seo/` — carte de partage, JSON-LD, sitemap, `robots.txt`,
favicon, page 404, redirections — et le bloc `faq` qui l'attendait. Reste la
phase 11, *Joindre* (`docs/roadmap.md`).

**Sur un clone neuf :** `npm install && npm run setup`, puis `npm run verify` —
qui compile, typecheck, construit le site *et son panel*, teste, et vérifie
formatage et lockfile. Une session sur le web n'a rien à faire : le hook de
`.claude/` pose Node 24 et installe (D125).
**Pour voir le panel :** `npm run demo:dev` — construit `dist/`, crée le compte
de démonstration s'il manque, et sert le site et son panel sur
`localhost:4321`. Sans clé d'email, le code à six chiffres s'affiche dans le
terminal.

## Où lire quoi

`docs/README.md` est l'index. En résumé :

| Tu travailles sur… | Lis |
|---|---|
| n'importe quoi dans ce dépôt | `docs/conventions.md` |
| l'outillage, les versions, la CI | `docs/environnement.md` |
| un bloc, un schéma, du contenu | `docs/modele-contenu.md` |
| le panel, l'auth, les médias | `docs/panel.md` + `docs/securite.md` |
| le build, la mise en ligne | `docs/publication.md` |
| une montée de version | `docs/mise-a-jour.md` |
| ce qui vient après les six phases | `docs/roadmap.md` |
| ce que contient un dépôt client | `docs/depot-client.md` |
| les tokens, une maquette à implémenter | `docs/design.md` |
| le référencement, le cadrage des images | `docs/seo-performances.md` |
| la mise en ligne d'un site | `docs/mise-en-prod.md` |
| email, contact, analytics | `docs/services.md` |
| Docker, Caddy, sauvegardes | `docs/deploiement.md` |
| comprendre un choix passé | `docs/decisions.md` |

## Trois niveaux d'engagement

Tout ce qui est écrit dans `docs/` n'engage pas au même degré :

- **Invariant** — les douze règles absolues ci-dessous. Jamais contourné.
- **Décidé** — une décision numérotée de `docs/decisions.md`. On ne s'en écarte
  qu'en actant la décision inverse, avec sa raison.
- **Hypothèse** — signalée *en italique*. Un point de départ, pas une consigne :
  la phase concernée la confirme ou la remplace, et consigne ce qu'elle retient.

Le *comment* d'une phase se décide dans la phase, pas d'avance
(`docs/implementation.md`).

## Stack

| Usage | Techno |
|---|---|
| Tout le code | TypeScript |
| Rendu du site public | Astro, statique |
| Schémas de contenu | Zod, sous un DSL `f.*` |
| Panel d'édition | React 19 + compilateur React, Mantine, dnd-kit |
| Styles | CSS natif + custom properties |
| Auth, sessions, leads | SQLite, par `node:sqlite` |
| Traitement d'images | sharp |
| Audience | analyse des logs d'accès de Caddy, aucun script |
| Déploiement | Docker Compose + Caddy |
| Mots de passe | Argon2id, par `@node-rs/argon2` |
| Email | Brevo, derrière une interface agnostique |

Pas de Tailwind. Pas de framework CSS. Pas d'ORM.

Versions épinglées à l'exact, et les deux qui ne sont volontairement pas les
dernières : `docs/environnement.md`. Le compilateur React est actif dès le
départ — pas de mémoïsation écrite à la main.

## Structure

```
src/
├── site/           site.config.ts : chargement, langues, tokens → CSS,
│                   capacités déclarées
├── fields/         DSL f.* → schéma Zod + description d'interface
├── content/        format de page, lecture, validation, messages français
├── media/          ingestion sharp, recadrage, manifeste, résolution, emplois ;
│                   documents PDF, seule exception à l'invariant 3
├── blocks/         blocs de référence
│   └── <nom>/      schema.ts + <Nom>.astro, plus <Nom>.desktop.astro
│                   quand le bloc porte une variante bureau
├── chrome/         en-tête et pied de page : deux emplacements bâtis comme
│   └── <nom>/      des blocs, qu'un dépôt client remplace dossier pour dossier
├── astro/          intégration : routes du site, du panel, aperçu, API
├── admin/          panel : island React unique
│   ├── theme.ts    les tokens du panel → thème Mantine + variables --panel-*
│   └── fields/     un composant par type de champ, une table d'aiguillage
├── server/         auth, sessions, journal, email, contenu, médias, git
│   └── email/      interface EmailProvider, brevo · console · memory
├── render/         les deux supports : la règle d'aiguillage, le préfixe du
│                   rendu bureau, et le contrat que les deux rendus tiennent
├── publish/        mise en ligne : versions, bascule, build, distant, file
├── client/         ce que contient un dépôt client : fichiers générés,
│                   paquet Claude Code, dépôt distant, montée de version
├── deploy/         la machine : runner SSH, provisionnement, sondes de doctor
├── migrations/     transformations de format de contenu, en liste ordonnée
├── seo/            carte de partage, JSON-LD, sitemap, robots, redirections ;
│                   les faits de l'entreprise et leurs champs
└── cli/            init, check, inventory, update, deploy, doctor,
                    migrate, admin:login, update-all
notes/              une note de version par tag, livrée dans le paquet
examples/demo/      site de démonstration, banc de test
scripts/            outillage du dépôt — jamais livré, jamais importé
.githooks/          pré-commit et pré-push
.claude/            l'amorçage d'une session sur le web — pas celui d'un
                    dépôt client, que src/client/ génère (D125)
docs/
```

Un `*.fixture.ts` est un banc d'essai : `tsconfig.build.json` l'écarte du
paquet au même titre qu'un test.

## Conventions

Détail dans `docs/conventions.md`. L'essentiel :

- **Chercher avant d'écrire.** `basalte inventory` liste tout ce qui est
  réutilisable, généré depuis le code. Écrire une variante locale d'une
  fonction existante est un défaut, même si elle marche.
- **Pas de `utils.ts`, pas de `helpers/`.** Un helper vit dans le dossier de
  son domaine. Un fourre-tout est là où la duplication s'accumule.
- **Un bloc ne valide rien à la main.** Une vérification manquante s'ajoute à
  `f.*`.
- **Ce qu'un site fait se lit, jamais ne bifurque.** Un réglage vit dans
  `capabilities` de `site.config.ts` et se lit au moment où le comportement se
  joue (D98). Un `--profile` ne change que ce qui est *écrit* au premier jour —
  jamais ce que le socle exécute.
- **Aucune valeur de style en dur dans un bloc.** Couleurs, espacements et
  typographies passent par un token — `docs/design.md`. Un besoin non couvert
  est un token à ajouter, jamais un `padding: 27px` isolé. Le panel a sa propre
  couche de tokens, `src/admin/theme.ts` (D95), et ne dessine aucune bordure
  (D97) : les plans se séparent par la valeur et l'ombre.
- **Un commentaire décrit ce qui existe, jamais comment on y est arrivé.**
  Pas de `// fix :`, pas de `// on utilise X plutôt que Y`, pas de
  `// amélioration :`, pas de `TODO`. Le pourquoi d'un choix va dans
  `docs/decisions.md`.
- **Anglais dans le code**, français dès qu'une chaîne s'affiche.
- **Un `.tsx` s'importe avec le suffixe `.js`**, jamais `.jsx` : c'est le nom du
  fichier compilé, et c'est lui que le paquet installé résout.
- **Apostrophe typographique** dans les chaînes et commentaires français : les
  chaînes sont délimitées par des apostrophes droites, la variante
  typographique n'a jamais à être échappée.

## Règles absolues

Ces invariants portent la sécurité et les performances. Les enfreindre donne un
projet qui fonctionne et une garantie détruite — c'est ce qui les rend
dangereuses. Raisons détaillées dans `docs/securite.md`.

1. **Jamais de HTML libre dans le contenu.** Texte échappé au rendu. Pour du
   gras et des liens : Markdown restreint assaini au build.
2. **SVG refusé au téléversement.**
3. **L'image stockée n'est jamais celle reçue** — ré-encodage sharp
   systématique, EXIF supprimé, nom dérivé de l'empreinte, type vérifié sur les
   octets réels.
4. **Aucun `^` dans les dépendances.** `npm ci` au déploiement.
5. **Le site public n'embarque aucun JavaScript par défaut.** Interactivité
   opt-in, bloc par bloc.
6. **Le panel est une island React unique**, montée en `client:only="react"`.
7. **Un bloc = un dossier, deux fichiers** — plus, au choix, sa variante
   bureau. Aucun registre central à éditer. Le chrome suit la même forme, à la
   règle de doublon près (D109).
8. **Aucun code du socle copié dans un dépôt client.**
9. **Les langues sont imbriquées dans les champs**, jamais un fichier par langue.
10. **`id` de bloc stable**, jamais l'index de position.
11. **Le build ne remplace jamais le site en place.**
12. **Le mot de passe initial ne transite jamais par email** — l'email porte
    déjà le second facteur.

## Commandes

| Commande | Effet |
|---|---|
| `basalte init <nom> [--profile <nom>]` | génère un dépôt client complet |
| `basalte check [--build]` | valide contenus contre schémas, construit sous `--build` |
| `basalte inventory [--json\|--agent]` | liste blocs et champs, ou régénère `.claude/basalte.md` |
| `basalte update [--dry-run] [--json]` | monte un site de version, ou annule tout |
| `basalte deploy --host <ip> [--dry-run]` | provisionne le VPS, ou le met à jour |
| `basalte doctor [--host <ip>] [--no-email]` | prouve que la configuration fonctionne |
| `basalte migrate [--dry-run]` | applique les migrations de format |
| `basalte admin:login --user <email> [--create]` | lien de connexion de secours (SSH), et création du compte |
| `basalte update-all <liste>` | monte de version une liste de sites |

`basalte check` s'exécute à l'enregistrement dans le panel, avant chaque build
et en pré-commit d'un dépôt client ; les hooks de ce dépôt-ci sont ceux de
`docs/environnement.md`. Il valide des contenus contre des schémas — ce n'est
pas un test d'intégration : l'auth, les images et la bascule ont leurs propres
tests (`docs/implementation.md`).

## Pièges connus

- Astro n'optimise que les images **importées** dans le code, pas celles
  désignées par une chaîne venue d'un JSON. Le socle ne s'y branche pas : il
  produit les largeurs à l'ingestion et le build recopie `public/` (D40).
- **La collecte des styles d'Astro ne traverse pas un module virtuel.** Un bloc
  importé depuis un module purement virtuel perd son CSS, sans erreur ni
  avertissement. Le module que le rendu consomme est donc un vrai fichier,
  écrit dans le dossier de génération (D45).
- Le code email d'authentification doit être lié à la tentative de connexion en
  cours, pas au seul compte, sinon il est rejouable ailleurs.
- Les emails d'auth empruntent un canal distinct de ceux du formulaire de
  contact.
- **Un `const enum` ambiant est inaccessible sous `verbatimModuleSyntax`.** Les
  liaisons napi en déclarent (`@node-rs/argon2` expose `Algorithm` ainsi) :
  lire un de leurs membres échoue au typecheck. La valeur numérique passe, sous
  une constante nommée.
- Installer depuis git installe du TypeScript non compilé : le package porte un
  script `prepare` qui le compile. Node refuse d'effacer les types sous
  `node_modules`, donc rien de ce que Node charge ne peut rester en `.ts`.
- Installer une dépendance git déclenche un `npm install` complet dans le clone
  temporaire, **chez le client**, dès qu'une clé parmi `prepare`, `postinstall`,
  `preinstall`, `install`, `prepack`, `build` ou le champ `workspaces` existe.
  `--omit=dev` n'y change rien, `--ignore-scripts` casse l'installation en
  silence. Détail et vérification dans `docs/environnement.md`.
- **git répond pour le dépôt le plus proche au-dessus.** Commiter, rebaser ou
  pousser depuis un dossier logé dans un autre dépôt agit sur ce dépôt-là. Toute
  opération git du panel est donc gardée par `isRepositoryRoot` (D62, D74).
- **Le build d'une mise en ligne n'écrit jamais dans `dist/`** : le panel
  construit y vit, et c'est lui que le processus exécute. Sa sortie va
  directement dans le dossier de la version (D68).
- **Le panel range ses fichiers dans `_panel/`, le site public dans `_astro/`**
  (D85). Le proxy sert le site depuis le disque et le panel depuis
  l'application : un dossier commun fait chercher l'island du panel parmi les
  fichiers du site — une page vide, sans la moindre erreur côté serveur.
- **Un `default` de Zod 4 n’est pas retraversé, un `prefault` l’est.** Le
  premier rend sa valeur telle quelle : une clé absente échappait donc à sa
  propre borne, et `required` ne valait que pour une clé présente ; un groupe
  absent rendait `{}` plutôt que ses champs remplis, et le composant du bloc
  plantait sur `props.labels.name`. Tout `src/fields/schema.ts` est en
  `prefault`.
- **`Number(null)` vaut zéro, pas `NaN`.** Un en-tête absent lu par
  `headers.get` puis converti passe donc toutes les bornes hautes : une garde
  de taille écrite ainsi ne garde rien. L'absence se teste pour elle-même
  (`withinLength`, dans `src/server/http.ts`).
- **Le bloc `contact` n'importe rien de `src/server/`.** Les trois identifiants
  de réponse y sont écrits en clair et un test les compare à `MARKERS` :
  importer le module du serveur entraînerait `node:sqlite` dans le build du site
  public, qui n'en a que faire.
- **Une valeur lue seulement dans un `return` de frontmatter `.astro` est vue
  comme inutilisée** par `astro check`. La lire aussi dans la condition qui
  précède le `return` suffit — ce qui pousse la logique hors du template, où
  elle se teste (`src/astro/preview.ts`).
- **`import.meta.url` ne désigne plus le fichier d'origine une fois le serveur
  du panel groupé.** Rien qui doive localiser un dossier du paquet à
  l'exécution ne peut s'y fier : le registre de blocs est embarqué dans le
  module généré (D56).
- **`@vitejs/plugin-react` exclut `node_modules` de Babel par défaut**, et le
  panel y vit une fois installé. Sans réglage, le compilateur React ne verrait
  jamais le seul React du projet.
- Le panel écrit dans `content/` et `public/media/`, et **ne commite que si la
  racine du site est la racine d'un dépôt git** : le site de démonstration, logé
  dans le dépôt du socle, ne doit pas y écrire d'historique.
- **Le contexte du panel ne s'ouvre qu'à la première requête**, et c'est là que
  démarrent la purge et la publication au démarrage. Une middleware l'ouvre pour
  toute requête : sans elle, seules quelques routes le faisaient, et une machine
  fraîchement démarrée servait `/admin` sans rien lancer (D88). La publication,
  elle, ne part pas sous `astro dev` — aucune version n'y est jamais servie, et
  la règle y lancerait un build de production à chaque page ouverte. Le module
  généré porte le drapeau `dev` qui le dit.
- **Un chemin Caddy est exact tant qu'il ne porte pas d'étoile.** `/admin/*` ne
  couvre pas `/admin` : le Caddyfile généré achemine les deux, faute de quoi
  l'adresse que le client tape tombe sur le serveur de fichiers, sans la moindre
  trace côté application. Le tri des directives est du même ordre — Caddy place
  `reverse_proxy` avant `file_server`, et seul un bloc `route` rend leur ordre
  écrit.
- **Une migration de format doit vivre sous `src/`.** `tsconfig.build.json` ne
  compile que `src/`, et Node refuse d'effacer les types sous `node_modules` :
  ailleurs, elle n'arriverait jamais exécutable chez le client (D87).
- **`commit` est un mot réservé de SQLite** : la colonne qui porte le commit
  d'une mise en ligne s'appelle `commit_sha`.
- **Un manifeste de `content/` n'est pas une page.** `media.json` et
  `documents.json` y vivent parce qu'ils sont versionnés et fusionnés comme les
  pages, mais `readContent` les écarte : en oublier un le rend page, et
  `basalte check` échoue sur un `$format` absent.
- **Un PDF n'est jamais ré-encodé.** C'est la seule exception à l'invariant 3,
  et elle ne tient qu'à ses six conditions (`docs/securite.md`) : capacité
  déclarée, octets réels vérifiés, nom d'empreinte, servi en pièce jointe,
  jamais incrusté, rangé hors du chemin des images.
- **Le rendu mobile est le composant du bloc, le bureau une variante.** Un
  `<Nom>.desktop.astro` reçoit les mêmes props et ne doit rien montrer que le
  mobile ne montre pas : Google indexe au robot smartphone, et `checkRenders`
  compare les deux HTML après chaque build. Il avertit, il ne bloque pas (D108).
- **Les deux rendus sortent d'un seul build**, rangés dans la même version : le
  bureau sous `_desktop/`, à côté de `_astro/` et de `_panel/` (D85). Le préfixe
  ne sort jamais du disque — les pages y portent les URL publiques, et Caddy y
  achemine par réécriture interne.
- **Une directive `handle` de Caddy n'accepte qu'un seul motif**, et aucun bloc
  ne s'ouvre en fin de ligne. Deux chemins passent par un matcher nommé. Se
  tromper fait échouer l'adaptation du fichier *entier* : Caddy ne sert alors
  plus une seule requête, et rien dans le dépôt ne le dit. `caddy validate` le
  dit, et un test de forme en tient la trace.
- **Une middleware Astro ne reçoit pas les en-têtes d'une route pré-rendue.**
  Aiguiller les deux rendus sous `astro dev` par là aurait servi le bureau à
  tout le monde, en silence. En développement, `/_desktop/` s'atteint en direct.
- **Le chrome se remplace, un bloc jamais.** Deux blocs de même nom sont une
  erreur ; deux chromes de même nom sont un remplacement, le site l'emportant
  sur le socle (D109). C'est le seul endroit du dépôt où `findBlocks` s'emploie
  en mode `replace`.
- **`content/chrome.json` est un manifeste, pas une page** (D110). L'oublier
  dans `MANIFESTS` de `src/content/read.ts` en ferait une route, et l'erreur
  qui suit parle d'un « type de section inconnu » — jamais du fichier fautif.
- **Un `<details>` déplié par media query demande deux règles.** Les moteurs
  anciens masquent le contenu replié par `display`, les récents par
  `content-visibility` sur `::details-content`, que `display` ne défait plus.
  N'écrire que la première donne un menu qui s'ouvre dans un navigateur et
  reste vide dans l'autre, sans la moindre erreur.
- **Le panel vit dans un navigateur.** Un module de `src/server/` importé pour
  une valeur — fût-ce une constante — y entraîne `node:path` et `node:fs`, et
  le build du panel échoue loin de la cause : le message nomme un paquet
  WebAssembly, à quatre sauts du fichier fautif. Ce que les deux côtés partagent
  vit dans un module pur : `src/chrome/define.ts`, `src/content/naming.ts`,
  `src/render/supports.ts`. `src/admin/island.test.ts` tient la règle, et nomme
  la chaîne quand elle casse.
- **Une fonction ne survit pas au JSON du registre.** Les descripteurs de blocs
  sont sérialisés dans le module généré (D56) : ce qu'un bloc déclare de
  *comportement* — le `structured` du JSON-LD — y arrive par un import du
  `schema`, à côté de celui du composant, jamais par le registre.
- **Astro n'écrit pas la page 404 au même endroit selon la route.** `/404` sort
  en `404.html`, à plat ; `/_desktop/404` suit la règle des dossiers. Le
  `Caddyfile` nomme donc deux chemins de formes différentes.
- **Une page de redirection n'est pas une page** : ni titre principal, ni
  contenu. Les contrôles qui parcourent le HTML produit l'écartent sur sa balise
  de rafraîchissement, faute de quoi `checkHeadings` la signale comme une page
  sans `h1`.
- **Le recadrage repart toujours de l'originale**, jamais d'un recadrage : le
  cadre est exprimé en pourcentage de l'originale, et repartir d'une découpe
  ajouterait une passe d'encodage à chaque correction. Le cadre entre dans
  l'empreinte, si bien que deux cadres différents sont deux clés et que refaire
  le même rend la même.
- **Le shell distant reçoit un script entier en un seul mot.** `deploy` le
  passe en argument de `sh -c`, échappé, et garde l'entrée standard libre : c'est
  par elle que le `.env` traverse, sans jamais devenir un fichier temporaire.
