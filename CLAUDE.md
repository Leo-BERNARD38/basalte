# basalte

Socle technique pour landing pages éditables par leurs propriétaires.
Publié en package npm `@leobernard/basalte`, installé depuis git par tag dans
un dépôt par site.

**État :** aucun code. Design validé, implémentation non commencée.
Prochaine étape : `docs/implementation.md`, étape 1.

## Où lire quoi

`docs/README.md` est l'index. En résumé :

| Tu travailles sur… | Lis |
|---|---|
| un bloc, un schéma, du contenu | `docs/modele-contenu.md` |
| le panel, l'auth, les médias | `docs/panel.md` + `docs/securite.md` |
| le build, la mise en ligne | `docs/publication.md` |
| email, contact, analytics | `docs/services.md` |
| Docker, Caddy, sauvegardes | `docs/deploiement.md` |
| comprendre un choix passé | `docs/decisions.md` |

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
├── blocks/         bibliothèque de blocs de base
│   └── <nom>/      schema.ts + <Nom>.astro
├── admin/          panel : island React unique
├── server/         auth, écriture contenu, publication, contact
├── seo/            meta, JSON-LD, sitemap, hreflang
└── cli/            init, check, migrate, admin:login, update-all
examples/demo/      site de démonstration, banc de test
docs/
```

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

## Commandes

| Commande | Effet |
|---|---|
| `basalte init <nom>` | génère un dépôt client complet |
| `basalte check` | valide contenus contre schémas, puis build |
| `basalte migrate` | applique les migrations de format |
| `basalte admin:login --user <email>` | lien de connexion de secours (SSH) |
| `basalte update-all` | monte de version une liste de sites |

`basalte check` s'exécute à l'enregistrement dans le panel, avant chaque build
et en pré-commit. C'est le test d'intégration du projet.

## Pièges connus

- Astro n'optimise que les images **importées** dans le code, pas celles
  désignées par une chaîne venue d'un JSON. Passer par `import.meta.glob`.
- Le code email d'authentification doit être lié à la tentative de connexion en
  cours, pas au seul compte, sinon il est rejouable ailleurs.
- Les emails d'auth empruntent un canal distinct de ceux du formulaire de
  contact.
