# Outillage IA — ce qui reste à construire

Deux chantiers distincts, à traiter après l'implémentation du socle.

Ce document ne garde que ce qui est **ouvert**. Ce qui a été décidé a rejoint
les documents concernés : la discipline de code dans `conventions.md`, la
commande de mise à jour et le format des notes de version dans `mise-a-jour.md`,
le contenu du dépôt client dans `depot-client.md`, les règles de design dans
`design.md`, la mise en ligne dans `mise-en-prod.md`, la couverture de tests
dans `implementation.md`. Ce qui a été construit est consigné phase par phase
dans `implementation.md` — le paquet Claude Code du dépôt client et toute
l'infrastructure de déploiement y sont, en phase 6.

---

## Chantier A — Le socle développé par Claude Code

Objectif : que ce dépôt soit un environnement où un agent code juste, vérifie
son travail seul, et ne casse pas les invariants.

`CLAUDE.md` et `docs/conventions.md` posent le contexte. Reste :

**Contexte**
- ~~Procédure de release (tag, semver, notes de version)~~ — écrite dans
  `mise-a-jour.md`, et `init` refuse désormais une version non publiée
- ~~Session-start hook pour Claude Code sur le web~~ — livré (D125)
- Convention de commit : de fait dans l'historique, pas encore écrite

**Skills**
- créer un bloc (schéma + composant + entrée dans la démo)
- ajouter un champ à un bloc existant, avec migration si le format change
- écrire une migration de format de contenu
- audit sécurité du panel avant release

**Commandes**
- `/nouveau-bloc <nom>`
- `/check` — enveloppe de `basalte check` avec sortie lisible par un agent
- `/release <version>` — vérifs, tag, notes de version au format figé

**Agents**
- **revue de réutilisation** : cette diff réécrit-elle quelque chose qui existe
  déjà ? C'est le plus rentable des quatre — la duplication discrète est le
  défaut le plus coûteux d'un agent
- revue de schéma : cohérence entre `schema.ts` et le composant `.astro`
- revue sécurité : les règles absolues du `CLAUDE.md`

**Vérifiabilité**

Le critère : un agent doit pouvoir savoir seul s'il a cassé quelque chose. Les
moyens sont arrêtés dans `implementation.md` — tests sur l'auth et le DSL,
`basalte check` sur le site de démonstration, diff du HTML généré.

Reste à outiller : rendre le diff HTML avant/après exécutable en une commande.

---

## Chantier B — Package IA embarqué dans les dépôts clients

Objectif : qu'un agent puisse produire une landing complète dans un dépôt
client, puis la maintenir, sans relire le socle. Le paquet lui-même est livré
(phase 6). Reste à cadrer :

- comment un agent découvre le contenu actuel d'un site sans tout lire — piste :
  une sortie compacte de `basalte inventory --content`
- garde-fous : un agent ne doit pas modifier `content/` en production sans
  passer par `basalte check` — la commande `/check` le dit, rien ne l'impose

---

## Infra et déploiement

Le provisionnement est livré (phase 6). Reste :

- Procédure de restauration : elle est celle d'une nouvelle installation, à
  exécuter réellement une fois pour la valider
- Sauvegarde du fichier SQLite : sans propriétaire dans le socle, assumé
  (`deploiement.md`)

---

## Points ouverts

Voir `implementation.md`.
