# Documentation de basalte

Socle technique pour landing pages éditables par leurs propriétaires.

## Par où commencer

| Tu veux… | Lis |
|---|---|
| comprendre le projet en cinq minutes | `contexte.md` puis `architecture.md` |
| savoir pourquoi un choix a été fait | `decisions.md` |
| écrire ou modifier un bloc | `modele-contenu.md` |
| travailler sur le panel d'édition | `panel.md`, puis `securite.md` |
| toucher au build ou à la mise en ligne | `publication.md` |
| brancher email, contact ou analytics | `services.md` |
| déployer ou provisionner un VPS | `deploiement.md` |
| savoir quoi construire ensuite | `implementation.md` |

## Les documents

| Fichier | Contenu |
|---|---|
| `contexte.md` | Le besoin, les quatre contraintes fondatrices, le vocabulaire |
| `decisions.md` | Les quinze décisions, avec l'alternative écartée et sa raison |
| `architecture.md` | Vue d'ensemble, répartition socle / dépôt client, distribution et mises à jour |
| `modele-contenu.md` | Format des pages, définition d'un bloc, DSL de champs, i18n, validation |
| `panel.md` | Authentification, génération des formulaires, médias, preview |
| `publication.md` | Du clic « Publier » au HTML en ligne |
| `seo-performances.md` | Ce qui produit le SEO et les performances |
| `securite.md` | Modèle de menace, plafond de dégâts, invariants |
| `services.md` | Formulaire de contact, email, analytics |
| `deploiement.md` | Docker, Caddy, dimensionnement, sauvegardes |
| `implementation.md` | Ordre des douze étapes, bibliothèque v1, hors périmètre |
| `roadmap-outillage-ia.md` | Chantiers d'outillage IA, notés et non développés |

## Statut

Design validé en brainstorming le 2026-08-29. Aucun code écrit.

Ces documents remplacent le spec monolithique d'origine, dont le contenu a été
réparti sans perte. L'historique git conserve la version validée.
