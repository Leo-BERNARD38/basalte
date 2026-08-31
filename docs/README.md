# Documentation de basalte

Socle technique pour landing pages éditables par leurs propriétaires.

## Par où commencer

| Tu veux… | Lis |
|---|---|
| comprendre le projet en cinq minutes | `contexte.md` puis `architecture.md` |
| savoir pourquoi un choix a été fait | `decisions.md` |
| écrire du code dans ce dépôt | `conventions.md` |
| installer le dépôt, régler l'outillage | `environnement.md` |
| savoir ce qu'un dépôt client contient | `depot-client.md` |
| implémenter une maquette, régler la DA | `design.md` |
| écrire ou modifier un bloc | `modele-contenu.md` |
| travailler sur le panel d'édition | `panel.md`, puis `securite.md` |
| toucher au build ou à la mise en ligne | `publication.md` |
| monter un site de version | `mise-a-jour.md` |
| brancher email, contact ou analytics | `services.md` |
| mettre un site en ligne sur un VPS | `mise-en-prod.md` |
| comprendre Docker, Caddy, les sauvegardes | `deploiement.md` |
| savoir quoi construire ensuite | `implementation.md` |
| savoir ce qui a été laissé de côté | `roadmap.md` |

## Les documents

| Fichier | Contenu |
|---|---|
| `contexte.md` | Le besoin, les quatre contraintes fondatrices, le vocabulaire |
| `decisions.md` | Les décisions actées, avec l'alternative écartée et sa raison |
| `architecture.md` | Vue d'ensemble, répartition socle / dépôt client, package vs template, accès git |
| `conventions.md` | Discipline de code : inventaire, commentaires, pas de fourre-tout |
| `environnement.md` | Les deux machines, versions épinglées, lockfile, formatage, hooks, CI |
| `depot-client.md` | Ce que `basalte init` génère, configuration, paquet Claude Code |
| `design.md` | Tokens, plancher non négociable, implémentation d'une maquette |
| `modele-contenu.md` | Format des pages, définition d'un bloc, DSL de champs, langues, migrations |
| `panel.md` | Structure de l'interface, moteur de formulaires, authentification, médias |
| `publication.md` | Du clic « Publier » au HTML en ligne |
| `mise-a-jour.md` | La commande de mise à jour, les notes de version, la mise à jour assistée |
| `seo-performances.md` | Ce qui produit le SEO et les performances |
| `securite.md` | Modèle de menace, plafond de dégâts, invariants |
| `services.md` | Formulaire de contact, email, analytics |
| `mise-en-prod.md` | Du VPS vide au site en ligne : `deploy`, `doctor`, retours en arrière |
| `deploiement.md` | Docker, Caddy, dimensionnement, sauvegardes |
| `implementation.md` | Les phases à venir, leurs enjeux · tests · blocs de référence · hors périmètre |
| `roadmap.md` | Ce qui est laissé de côté, et ce qui le ferait revenir |

## Trois niveaux de lecture

Tout ce qui est écrit ici n'engage pas au même degré. `implementation.md`
détaille la règle ; en résumé :

| Niveau | Une phase peut-elle le changer ? |
|---|---|
| **Invariant** — les douze règles absolues de `securite.md` | non |
| **Décidé** — une décision numérotée de `decisions.md` | seulement en actant la décision inverse |
| **Hypothèse** — signalée en italique | oui, librement, en consignant ce qu'elle retient |

Une hypothèse est un point de départ pour ne pas repartir de zéro, pas une
consigne. Le *comment* d'une phase se décide dans la phase.

## Statut

Treize phases sont faites : rendu, authentification, panel, mise en ligne,
formulaire de contact, livraison, outillage, double rendu, chrome, cadrage des
images et SEO, notification des messages, relevé du contenu, publication du
socle. Un site se crée, se met en production et se monte de version en une
commande chacune ; une version du socle se publie en une commande aussi.
`implementation.md` en tient le relevé, et `decisions.md` la raison de chaque
choix.

Une phase est écrite et à faire : **Partager** — un bloc écrit une fois sert à
plusieurs sites.

Ces documents remplacent le spec monolithique d'origine, dont le contenu a été
réparti sans perte. L'historique git conserve la version validée.
