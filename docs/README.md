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
| savoir ce qui vient après les six phases | `roadmap.md` |

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
| `implementation.md` | Les six phases, leurs enjeux, tests, hors périmètre |
| `roadmap.md` | Les phases 7 à 11 : outillage, double rendu, chrome, images, SEO, leads — toutes faites |
| `roadmap-outillage-ia.md` | Chantiers d'outillage IA restants |

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

Design validé en brainstorming le 2026-08-29, fondations techniques posées le
même jour (`environnement.md`), les six phases faites dans la foulée.

**Phase 1** — DSL de champs, moteur de blocs, intégration Astro, médias,
`basalte check` et `basalte inventory`. Le site de démonstration se construit
depuis son JSON. Décisions D40 à D46.

**Phase 2** — le flux d'authentification entier : mot de passe généré et haché
en Argon2id, code à usage unique par email, appareil de confiance, sessions,
journal, limitation de débit, et `basalte admin:login`. Décisions D47 à D53.

**Phase 3** — le panel : formulaires produits depuis la description des champs,
enregistrement validé puis commité, médiathèque avec texte alternatif et point
focal, réordonnancement, visibilité par langue, aperçu du contenu non publié.
Décisions D55 à D65.

**Phase 4** — la mise en ligne : rebase, build en processus enfant, bascule
atomique, push, file à une place, et un échec qui laisse le site debout.
Décisions D67 à D75.

**Phase 5** — servir : formulaire de contact sans une ligne de JavaScript,
anti-spam, messages gardés en base avant tout envoi, purge des données
personnelles, audience lue dans les logs de Caddy. Décisions D76 à D85.

**Phase 6** — livrer : `basalte init` et le paquet Claude Code du dépôt client,
`deploy`, `doctor`, `update`, les migrations de format, `update-all`, et les
fichiers de la machine. Décisions D87 à D94.

**Après les phases** — le panel a repris sa direction artistique : une couche de
tokens à lui dans `src/admin/theme.ts`, l'aperçu au centre de l'écran
d'édition, et aucune bordure. Décisions D95 à D97.

**Phase 7 — Outiller** — la grammaire enrichie de `f.richtext`, deux documents
légaux générés, le PDF téléchargeable, le contexte du site en `docs/CONTEXT.md`
et `docs/DESIGN.md`, le banc de blocs `/__blocs`, les capacités déclarées et
les profils d'`init`. Décisions D98 à D102.

**Phase 8 — Adapter** — deux rendus construits depuis un seul contenu et servis
chacun à son support, la variante bureau d'un bloc, et le contrat qui garantit
que le mobile porte tout. Décisions D103 à D108.

**Phase 9 — Encadrer** — l'en-tête et le pied de page autour de chaque page,
remplaçables par site, un menu qui se déduit des pages tant que personne ne l'a
rangé, et le `h1` rendu à la première section. Décisions D109 à D116.

**Phase 10 — Cadrer** — le recadrage des images au format que leur emplacement
déclare, la fiche d'entreprise comme source structurée, et `src/seo/` : carte
de partage, JSON-LD, sitemap, `robots.txt`, favicon, page 404, redirections.
Plus le bloc `faq`, qui l'attendait. Décisions D117 à D124.

**Phase 11 — Joindre** — un second canal qui prévient le client hors email, la
preuve que ses emails sont configurés pour arriver et pas seulement pour partir,
une page de remerciement qui donne une adresse à la conversion, et les trois
phrases qui suppriment les appels que le panel provoquait. Décisions D126 à
D134.

Les onze phases sont faites. Ce qui a été identifié et volontairement laissé de
côté est listé dans `roadmap.md`, avec ce qui le ferait revenir.

Ces documents remplacent le spec monolithique d'origine, dont le contenu a été
réparti sans perte. L'historique git conserve la version validée.
