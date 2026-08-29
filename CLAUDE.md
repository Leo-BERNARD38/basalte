# basalte

Socle technique pour landing pages éditables par leurs propriétaires.
Package npm `@leobernard/basalte`, installé depuis git par tag dans un dépôt
par site — dépôt public, jamais publié sur le registre npm.

**État :** phase 1 faite — DSL de champs, moteur de blocs, intégration Astro,
médias, `basalte check` et `basalte inventory`. Le site de démonstration se
construit depuis son JSON (`examples/demo`). Prochaine étape : trancher l'ordre
en tête de `docs/implementation.md`, puis la phase retenue.

**Sur un clone neuf :** `npm install && npm run setup`, puis `npm run verify`.

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
| ce que contient un dépôt client | `docs/depot-client.md` |
| les tokens, une maquette à implémenter | `docs/design.md` |
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
| Auth, sessions, leads | SQLite |
| Traitement d'images | sharp |
| Déploiement | Docker Compose + Caddy |
| Email | Brevo, derrière une interface agnostique |

Pas de Tailwind. Pas de framework CSS. Pas d'ORM.

Versions épinglées à l'exact, et les deux qui ne sont volontairement pas les
dernières : `docs/environnement.md`. Le compilateur React est actif dès le
départ — pas de mémoïsation écrite à la main.

## Structure

```
src/
├── site/           site.config.ts : chargement, langues, tokens → CSS
├── fields/         DSL f.* → schéma Zod + description d'interface
├── content/        format de page, lecture, validation, messages français
├── media/          ingestion sharp, manifeste, résolution vers srcset
├── blocks/         blocs de référence
│   └── <nom>/      schema.ts + <Nom>.astro
├── astro/          intégration Astro (routes, langues, layout)
├── admin/          panel : island React unique
├── server/         auth, écriture contenu, publication, contact
├── seo/            meta, JSON-LD, sitemap, hreflang
└── cli/            init, check, inventory, update, deploy, doctor,
                    migrate, admin:login, update-all
migrations/         transformations de format de contenu
examples/demo/      site de démonstration, banc de test
scripts/            outillage du dépôt — jamais livré, jamais importé
.githooks/          pré-commit et pré-push
docs/
```

`admin/`, `server/`, `seo/` et `migrations/` n'existent pas encore : ils
arrivent avec leur phase.

## Conventions

Détail dans `docs/conventions.md`. L'essentiel :

- **Chercher avant d'écrire.** `basalte inventory` liste tout ce qui est
  réutilisable, généré depuis le code. Écrire une variante locale d'une
  fonction existante est un défaut, même si elle marche.
- **Pas de `utils.ts`, pas de `helpers/`.** Un helper vit dans le dossier de
  son domaine. Un fourre-tout est là où la duplication s'accumule.
- **Un bloc ne valide rien à la main.** Une vérification manquante s'ajoute à
  `f.*`.
- **Aucune valeur de style en dur dans un bloc.** Couleurs, espacements et
  typographies passent par un token — `docs/design.md`. Un besoin non couvert
  est un token à ajouter, jamais un `padding: 27px` isolé.
- **Un commentaire décrit ce qui existe, jamais comment on y est arrivé.**
  Pas de `// fix :`, pas de `// on utilise X plutôt que Y`, pas de
  `// amélioration :`, pas de `TODO`. Le pourquoi d'un choix va dans
  `docs/decisions.md`.
- **Anglais dans le code**, français dès qu'une chaîne s'affiche.
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
7. **Un bloc = un dossier, deux fichiers.** Aucun registre central à éditer.
8. **Aucun code du socle copié dans un dépôt client.**
9. **Les langues sont imbriquées dans les champs**, jamais un fichier par langue.
10. **`id` de bloc stable**, jamais l'index de position.
11. **Le build ne remplace jamais le site en place.**
12. **Le mot de passe initial ne transite jamais par email** — l'email porte
    déjà le second facteur.

## Commandes

| Commande | Effet |
|---|---|
| `basalte init <nom>` | génère un dépôt client complet |
| `basalte check [--build]` | valide contenus contre schémas, construit sous `--build` |
| `basalte inventory [--json]` | liste blocs, champs et helpers réutilisables |
| `basalte update` | monte un site de version, ou annule tout |
| `basalte deploy --host <ip>` | provisionne le VPS, ou le met à jour |
| `basalte doctor` | prouve que la configuration fonctionne |
| `basalte migrate` | applique les migrations de format |
| `basalte admin:login --user <email>` | lien de connexion de secours (SSH) |
| `basalte update-all <liste>` | monte de version une liste de sites |

`basalte check` s'exécute à l'enregistrement dans le panel, avant chaque build
et en pré-commit. Il valide des contenus contre des schémas — ce n'est pas un
test d'intégration : l'auth, les images et la bascule ont leurs propres tests
(`docs/implementation.md`).

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
- Installer depuis git installe du TypeScript non compilé : le package porte un
  script `prepare` qui le compile. Node refuse d'effacer les types sous
  `node_modules`, donc rien de ce que Node charge ne peut rester en `.ts`.
- Installer une dépendance git déclenche un `npm install` complet dans le clone
  temporaire, **chez le client**, dès qu'une clé parmi `prepare`, `postinstall`,
  `preinstall`, `install`, `prepack`, `build` ou le champ `workspaces` existe.
  `--omit=dev` n'y change rien, `--ignore-scripts` casse l'installation en
  silence. Détail et vérification dans `docs/environnement.md`.
