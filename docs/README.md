# Documentation de basalte

Socle technique pour landing pages éditables par leurs propriétaires.

## Par où commencer

| Tu veux… | Lis |
|---|---|
| comprendre le projet en cinq minutes | `contexte.md` puis `architecture.md` |
| savoir pourquoi un choix a été fait | `decisions.md` |
| écrire du code dans ce dépôt | `conventions.md` |
| écrire ou modifier un bloc | `modele-contenu.md` |
| travailler sur le panel d'édition | `panel.md`, puis `securite.md` |
| toucher au build ou à la mise en ligne | `publication.md` |
| monter un site de version | `mise-a-jour.md` |
| brancher email, contact ou analytics | `services.md` |
| déployer ou provisionner un VPS | `deploiement.md` |
| savoir quoi construire ensuite | `implementation.md` |

## Les documents

| Fichier | Contenu |
|---|---|
| `contexte.md` | Le besoin, les quatre contraintes fondatrices, le vocabulaire |
| `decisions.md` | Les vingt-cinq décisions, avec l'alternative écartée et sa raison |
| `architecture.md` | Vue d'ensemble, répartition socle / dépôt client, package vs template, accès git |
| `conventions.md` | Discipline de code : inventaire, commentaires, pas de fourre-tout |
| `modele-contenu.md` | Format des pages, définition d'un bloc, DSL de champs, langues, migrations |
| `panel.md` | Structure de l'interface, authentification, médias |
| `publication.md` | Du clic « Publier » au HTML en ligne |
| `mise-a-jour.md` | La commande de mise à jour, les notes de version, la mise à jour assistée |
| `seo-performances.md` | Ce qui produit le SEO et les performances |
| `securite.md` | Modèle de menace, plafond de dégâts, invariants |
| `services.md` | Formulaire de contact, email, analytics |
| `deploiement.md` | Docker, Caddy, dimensionnement, sauvegardes |
| `implementation.md` | Ordre des douze étapes, tests, blocs de référence, hors périmètre |
| `roadmap-outillage-ia.md` | Chantiers d'outillage IA restants |

## Statut

Design validé en brainstorming le 2026-08-29. Aucun code écrit.

Ces documents remplacent le spec monolithique d'origine, dont le contenu a été
réparti sans perte. L'historique git conserve la version validée.
