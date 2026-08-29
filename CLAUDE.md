# basalte

Socle technique pour landing pages éditables par leurs propriétaires.
Package npm `@leobernard/basalte`, installé depuis git par tag dans un dépôt
par site — dépôt public, jamais publié sur le registre npm.

**État :** aucun code. Design validé, implémentation non commencée.
Prochaine étape : `docs/implementation.md`, phase 1.

## Où lire quoi

`docs/README.md` est l'index. En résumé :

| Tu travailles sur… | Lis |
|---|---|
| n'importe quoi dans ce dépôt | `docs/conventions.md` |
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
| Panel d'édition | React + Mantine + dnd-kit |
| Styles | CSS natif + custom properties |
| Auth, sessions, leads | SQLite |
| Traitement d'images | sharp |
| Déploiement | Docker Compose + Caddy |
| Email | Brevo, derrière une interface agnostique |

Pas de Tailwind. Pas de framework CSS. Pas d'ORM.

## Structure

```
src/
├── astro/          intégration Astro (injecte routes, i18n, sitemap)
├── fields/         DSL f.* → schéma Zod + description d'interface
├── blocks/         blocs de référence
│   └── <nom>/      schema.ts + <Nom>.astro
├── admin/          panel : island React unique
├── server/         auth, écriture contenu, publication, contact
├── seo/            meta, JSON-LD, sitemap, hreflang
└── cli/            init, check, inventory, update, deploy, doctor,
                    migrate, admin:login, update-all
migrations/         transformations de format de contenu
examples/demo/      site de démonstration, banc de test
docs/
```

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
| `basalte check` | valide contenus contre schémas, puis build |
| `basalte inventory` | liste blocs, champs et helpers réutilisables |
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
  désignées par une chaîne venue d'un JSON. Passer par `import.meta.glob`.
- Astro garde les images optimisées dans `node_modules/.astro`. Le build tourne
  toujours dans le même dossier de travail ; seul le `dist/` est déplacé dans
  `releases/`. Sinon tout est ré-encodé à chaque publication.
- Le code email d'authentification doit être lié à la tentative de connexion en
  cours, pas au seul compte, sinon il est rejouable ailleurs.
- Les emails d'auth empruntent un canal distinct de ceux du formulaire de
  contact.
- Installer depuis git installe du TypeScript non compilé : le package a besoin
  d'un script `prepare`.
